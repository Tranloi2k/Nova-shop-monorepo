/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewInput, UpdateReviewInput } from './dto/review.input';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async findAll(): Promise<Review[]> {
    return this.reviewRepository.find({ relations: ['product'] });
  }

  async findOne(id: number): Promise<Review | null> {
    return this.reviewRepository.findOne({ where: { id }, relations: ['product'] });
  }

  async create(createReviewInput: CreateReviewInput, user: any): Promise<Review> {
    const { productId, ...rest } = createReviewInput;
    const review = this.reviewRepository.create({
      ...rest,
      product: { id: productId } as any,
      userId: user.id,
      name: user.username,
    });
    return this.reviewRepository.save(review);
  }

  async update(id: number, updateReviewInput: UpdateReviewInput, user: any): Promise<Review | null> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== user.id) {
      throw new ForbiddenException('You are not authorized to update this review');
    }
    await this.reviewRepository.update(id, updateReviewInput);
    return this.reviewRepository.findOne({ where: { id } });
  }

  async remove(id: number, user: any): Promise<boolean> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You are not authorized to delete this review');
    }
    await this.reviewRepository.delete(id);
    return true;
  }

  async countByProductId(productId: number): Promise<number> {
    return this.reviewRepository.count({
      where: { product: { id: productId } },
    });
  }

  // Tính điểm trung bình của một product
  async getAverageRating(productId: number): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.productId = :productId', { productId })
      .getRawOne();

    return parseFloat(result.average) || 0;
  }

  // Lấy điểm trung bình cho nhiều products (tối ưu cho DataLoader)
  async getAverageRatings(productIds: number[]): Promise<Record<number, number>> {
    const results = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.productId', 'productId')
      .addSelect('AVG(review.rating)', 'average')
      .where('review.productId IN (:...productIds)', { productIds })
      .groupBy('review.productId')
      .getRawMany();

    return results.reduce((acc, curr) => {
      acc[curr.productId] = parseFloat(curr.average) || 0;
      return acc;
    }, {});
  }

  // Lấy số lượng reviews cho nhiều products (tối ưu cho DataLoader)
  async getReviewCounts(productIds: number[]): Promise<Record<number, number>> {
    const results = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.productId', 'productId')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.productId IN (:...productIds)', { productIds })
      .groupBy('review.productId')
      .getRawMany();

    return results.reduce((acc, curr) => {
      acc[curr.productId] = parseInt(curr.count) || 0;
      return acc;
    }, {});
  }
}
