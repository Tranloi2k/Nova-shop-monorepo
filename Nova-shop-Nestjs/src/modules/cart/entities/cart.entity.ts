import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from 'src/modules/user/user.entity';
import type { CartItem } from './cart-item.entity';

const CartItemEntity = (): typeof CartItem => require('./cart-item.entity').CartItem;

@ObjectType()
@Entity('carts')
export class Cart {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column()
  userId: number;

  @Field(() => Int)
  @Column()
  quantity: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.carts)
  user: User;

  @Field(() => [CartItemEntity()])
  @OneToMany(CartItemEntity, (cartItem: CartItem) => cartItem.cart, { cascade: true })
  items: CartItem[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
