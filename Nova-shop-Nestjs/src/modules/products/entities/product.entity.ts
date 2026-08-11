import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import type { Review } from 'src/modules/reviews/entities/review.entity';
import { ColumnNumericTransformer } from 'src/common/transformers/column-numeric.transformer';

const ReviewEntity = (): typeof Review =>
  require('../../reviews/entities/review.entity').Review;

@ObjectType() // Đánh dấu class là một GraphQL Object Type
@Entity('Products')
export class Product {
  @Field() // Đánh dấu trường là một GraphQL Field
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  description: string;

  @Field()
  @Column()
  image: string;

  @Field()
  @Column()
  colors: string;

  @Field()
  @Column()
  images: string;

  @Field()
  @Column()
  storageOptions: string;

  @Field(() => Int)
  @Column('decimal', { transformer: ColumnNumericTransformer })
  price: number;

  @Field(() => Int)
  @Column()
  discount: number;

  @Field(() => Int)
  @Column({ default: 100 })
  stock: number;

  @Field()
  @Column({ default: 'accessories' })
  category: string;

  @Field({ nullable: true }) // Đánh dấu trường là một GraphQL Field (nếu cần)
  @Column({ type: 'text', nullable: true }) // Sử dụng kiểu text để lưu JSON dưới dạng chuỗi
  detailInformation: string;

  @Field(() => [ReviewEntity()], { name: 'reviews' })
  @OneToMany(ReviewEntity, (reviews: Review) => reviews.product)
  reviews: Review[];
}
