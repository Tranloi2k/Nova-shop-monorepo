import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Product } from 'src/modules/products/entities/product.entity';

@ObjectType() // Đánh dấu class là một GraphQL Object Type
@Entity('reviews')
export class Review {
  @Field(() => Int) // Đánh dấu trường là một GraphQL Field
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  comment: string;

  @Field()
  @Column()
  name: string;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  userId: number;

  @Field(() => Int)
  @Column()
  rating: number;

  @Field()
  @Column()
  createdAt: string;

  @Field(() => Product) // Đánh dấu quan hệ với Product
  @ManyToOne(() => Product, (product) => product.reviews) // Quan hệ nhiều-1 với Product
  product: Product;
}
