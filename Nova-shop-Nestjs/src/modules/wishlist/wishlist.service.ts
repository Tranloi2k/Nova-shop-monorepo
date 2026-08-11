import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Product } from '../products/entities/product.entity';
import {
  WishlistCheckResponseDto,
  WishlistResponseDto,
} from './dto/wishlist-response.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem)
    private readonly wishlistRepository: Repository<WishlistItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getWishlist(userId: number): Promise<WishlistResponseDto> {
    const items = await this.wishlistRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      totalItems: items.length,
    };
  }

  async getWishlistProductIds(userId: number): Promise<number[]> {
    const rows = await this.wishlistRepository.find({
      where: { userId },
      select: ['productId'],
      order: { createdAt: 'DESC' },
    });

    return rows.map((row) => row.productId);
  }

  async checkInWishlist(
    userId: number,
    productId: number,
  ): Promise<WishlistCheckResponseDto> {
    const item = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    return { inWishlist: Boolean(item) };
  }

  async addToWishlist(
    userId: number,
    productId: number,
  ): Promise<WishlistResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });
    if (existing) {
      throw new ConflictException('Product is already in wishlist');
    }

    const item = this.wishlistRepository.create({ userId, productId });
    await this.wishlistRepository.save(item);

    return this.getWishlist(userId);
  }

  async removeFromWishlist(
    userId: number,
    productId: number,
  ): Promise<WishlistResponseDto> {
    const item = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (!item) {
      throw new NotFoundException('Product not found in wishlist');
    }

    await this.wishlistRepository.remove(item);

    return this.getWishlist(userId);
  }
}
