import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto, PRODUCT_CATEGORY_VALUES } from './dto/query-product.dto';
import { PaginatedProductResponseDto } from './dto/paginated-product-response.dto';
import { Product } from './entities/product.entity';
import { Review } from '../reviews/entities/review.entity';

type ProductWithStats = Product & { rate: number; reviewCount: number };

const MAX_PAGE_LIMIT = 100;
const CACHE_TTL_MS = 10_000;
const MAX_CACHE_ENTRIES = 100;
// import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private productsCache = new Map<string, { data: PaginatedProductResponseDto; expiresAt: number }>();

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private getFromCache(cacheKey: string): PaginatedProductResponseDto | null {
    const cached = this.productsCache.get(cacheKey);
    if (!cached) {
      return null;
    }
    if (cached.expiresAt <= Date.now()) {
      this.productsCache.delete(cacheKey);
      return null;
    }
    this.productsCache.delete(cacheKey);
    this.productsCache.set(cacheKey, cached);
    return cached.data;
  }

  private setCache(cacheKey: string, data: PaginatedProductResponseDto): void {
    if (
      this.productsCache.size >= MAX_CACHE_ENTRIES &&
      !this.productsCache.has(cacheKey)
    ) {
      const oldestKey = this.productsCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.productsCache.delete(oldestKey);
      }
    }
    this.productsCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  private applyProductFilters(
    queryBuilder: ReturnType<Repository<Product>['createQueryBuilder']>,
    filters: {
      search?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      onSale?: string;
    },
  ) {
    const { search, category, minPrice, maxPrice, onSale } = filters;

    if (search?.trim()) {
      queryBuilder.andWhere('(product.name LIKE :search OR product.description LIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    if (category && (PRODUCT_CATEGORY_VALUES as readonly string[]).includes(category)) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (onSale === 'true' || onSale === '1') {
      queryBuilder.andWhere('product.discount > 0');
    }
  }

  private mapProductsWithStats(products: Product[]): ProductWithStats[] {
    return products.map((product) => {
      const ratings = product.reviews?.map((review) => review.rating) ?? [];
      const averageRating =
        ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      return {
        ...product,
        rate: averageRating,
        reviewCount: product.reviews?.length ?? 0,
      };
    });
  }

  private sortProducts(products: ProductWithStats[], sort: string): ProductWithStats[] {
    const sorted = [...products];

    switch (sort) {
      case 'price-low':
        return sorted.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-high':
        return sorted.sort((a, b) => Number(b.price) - Number(a.price));
      case 'newest':
        return sorted.sort((a, b) => b.id - a.id);
      case 'rating':
        return sorted.sort((a, b) => b.rate - a.rate || b.id - a.id);
      case 'popular':
      default:
        return sorted.sort((a, b) => b.reviewCount - a.reviewCount || b.id - a.id);
    }
  }

  async findAll(queryDto?: QueryProductDto): Promise<PaginatedProductResponseDto> {
    const cacheKey = JSON.stringify(queryDto || {});
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const {
      search,
      category,
      sort = 'popular',
      minPrice,
      maxPrice,
      onSale,
      page = 1,
      limit = 10,
    } = queryDto || {};

    const safeLimit = Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT);
    const safePage = Math.max(page, 1);

    const filterParams = { search, category, minPrice, maxPrice, onSale };
    const skip = (safePage - 1) * safeLimit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.reviews', 'reviews');

    this.applyProductFilters(queryBuilder, filterParams);

    // Thêm các trường select ảo tính toán từ subquery để sắp xếp ở DB
    queryBuilder.addSelect((subQuery) => {
      return subQuery
        .select('COALESCE(AVG(r.rating), 0)', 'avg_rating')
        .from(Review, 'r')
        .where('r.productId = product.id');
    }, 'product_average_rating');

    queryBuilder.addSelect((subQuery) => {
      return subQuery
        .select('COUNT(r.id)', 'reviews_count')
        .from(Review, 'r')
        .where('r.productId = product.id');
    }, 'product_reviews_count');

    // Xử lý sắp xếp (Sorting) trực tiếp ở tầng database (SQL Level)
    switch (sort) {
      case 'price-low':
        queryBuilder.orderBy('product.price', 'ASC').addOrderBy('product.id', 'DESC');
        break;
      case 'price-high':
        queryBuilder.orderBy('product.price', 'DESC').addOrderBy('product.id', 'DESC');
        break;
      case 'newest':
        queryBuilder.orderBy('product.id', 'DESC');
        break;
      case 'rating':
        queryBuilder.orderBy('product_average_rating', 'DESC').addOrderBy('product.id', 'DESC');
        break;
      case 'popular':
      default:
        queryBuilder.orderBy('product_reviews_count', 'DESC').addOrderBy('product.id', 'DESC');
        break;
    }

    // Thực hiện truy vấn phân trang trực tiếp từ Database
    const total = await queryBuilder.getCount();
    const products = await queryBuilder.skip(skip).take(safeLimit).getMany();

    // Map thêm thông tin ảo rate & reviewCount cho các sản phẩm đã phân trang
    const productsWithRating = this.mapProductsWithStats(products);
    const totalPages = Math.ceil(total / safeLimit);

    const result = {
      products: productsWithRating,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    };

    this.setCache(cacheKey, result);

    return result;
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id }, relations: ['reviews'] });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  //   async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
  //     const product = await this.findOne(id);
  //     Object.assign(product, updateProductDto);
  //     return this.productRepository.save(product);
  //   }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}
