import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import type { Cart } from './cart.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { ColumnNumericTransformer } from 'src/common/transformers/column-numeric.transformer';

const CartEntity = (): typeof Cart => require('./cart.entity').Cart;

@ObjectType()
@Entity('cart_items')
export class CartItem {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column()
  cartId: number;

  @Field(() => Int)
  @Column()
  productId: number;

  @Field(() => Int)
  @Column()
  quantity: number;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 128, default: '' })
  color: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 128, default: '' })
  storage: string;

  @Field(() => Float)
  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  price: number;

  @Field(() => CartEntity())
  @ManyToOne(CartEntity, (cart: Cart) => cart.items, { onDelete: 'CASCADE' })
  cart: Cart;

  @Field(() => Product)
  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
