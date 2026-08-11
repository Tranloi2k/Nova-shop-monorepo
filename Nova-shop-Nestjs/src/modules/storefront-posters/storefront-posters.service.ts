import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorefrontPoster } from './entities/storefront-poster.entity';
import { Product } from '../products/entities/product.entity';
import {
  AdminCreatePosterDto,
  AdminReorderPostersDto,
  AdminUpdatePosterDto,
} from './dto/admin-poster.dto';
import { MAX_STOREFRONT_POSTERS } from './storefront-posters.constants';

export type PublicPosterDto = {
  id: number;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    discount: number;
  };
};

@Injectable()
export class StorefrontPostersService {
  constructor(
    @InjectRepository(StorefrontPoster)
    private readonly posterRepository: Repository<StorefrontPoster>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private async assertProductExists(productId: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }
    return product;
  }

  private async assertUnderPosterLimit(): Promise<void> {
    const count = await this.posterRepository.count();
    if (count >= MAX_STOREFRONT_POSTERS) {
      throw new BadRequestException(
        `Maximum of ${MAX_STOREFRONT_POSTERS} storefront posters allowed`,
      );
    }
  }

  private mapPublicPoster(poster: StorefrontPoster): PublicPosterDto {
    return {
      id: poster.id,
      imageUrl: poster.imageUrl,
      altText: poster.altText,
      sortOrder: poster.sortOrder,
      product: {
        id: poster.product.id,
        name: poster.product.name,
        description: poster.product.description,
        price: Number(poster.product.price),
        discount: Number(poster.product.discount) || 0,
      },
    };
  }

  async findActivePublic(): Promise<PublicPosterDto[]> {
    const posters = await this.posterRepository.find({
      where: { isActive: true },
      relations: ['product'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return posters.map((poster) => this.mapPublicPoster(poster));
  }

  async findAllAdmin(): Promise<StorefrontPoster[]> {
    return this.posterRepository.find({
      relations: ['product'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async create(dto: AdminCreatePosterDto): Promise<StorefrontPoster> {
    await this.assertUnderPosterLimit();
    await this.assertProductExists(dto.productId);

    const maxSort = await this.posterRepository
      .createQueryBuilder('poster')
      .select('MAX(poster.sortOrder)', 'max')
      .getRawOne<{ max: string | null }>();

    const nextSortOrder =
      dto.sortOrder ?? (maxSort?.max != null ? Number(maxSort.max) + 1 : 0);

    const poster = this.posterRepository.create({
      imageUrl: dto.imageUrl,
      productId: dto.productId,
      altText: dto.altText?.trim() || null,
      sortOrder: nextSortOrder,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.posterRepository.save(poster);
    return this.findOneAdmin(saved.id);
  }

  async findOneAdmin(id: number): Promise<StorefrontPoster> {
    const poster = await this.posterRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!poster) {
      throw new NotFoundException(`Poster with id ${id} not found`);
    }
    return poster;
  }

  async update(id: number, dto: AdminUpdatePosterDto): Promise<StorefrontPoster> {
    const poster = await this.findOneAdmin(id);

    if (dto.productId !== undefined) {
      await this.assertProductExists(dto.productId);
      poster.productId = dto.productId;
    }
    if (dto.imageUrl !== undefined) poster.imageUrl = dto.imageUrl;
    if (dto.altText !== undefined) poster.altText = dto.altText.trim() || null;
    if (dto.sortOrder !== undefined) poster.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) poster.isActive = dto.isActive;

    await this.posterRepository.save(poster);
    return this.findOneAdmin(id);
  }

  async delete(id: number): Promise<void> {
    const poster = await this.findOneAdmin(id);
    await this.posterRepository.remove(poster);
  }

  async reorder(dto: AdminReorderPostersDto): Promise<StorefrontPoster[]> {
    const posters = await this.findAllAdmin();
    const existingIds = new Set(posters.map((p) => p.id));

    if (dto.orderedIds.length !== posters.length) {
      throw new BadRequestException('orderedIds must include every poster exactly once');
    }

    const unique = new Set(dto.orderedIds);
    if (unique.size !== dto.orderedIds.length) {
      throw new BadRequestException('orderedIds must not contain duplicates');
    }

    for (const id of dto.orderedIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Unknown poster id: ${id}`);
      }
    }

    await Promise.all(
      dto.orderedIds.map((id, index) =>
        this.posterRepository.update(id, { sortOrder: index }),
      ),
    );

    return this.findAllAdmin();
  }
}
