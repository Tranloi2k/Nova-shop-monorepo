import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { Exclude } from 'class-transformer';
import type { Cart } from 'src/modules/cart/entities/cart.entity';
import { UserRole } from './user-role.enum';

const CartEntity = (): typeof Cart => require('../cart/entities/cart.entity').Cart;

@ObjectType() // Đánh dấu class là một GraphQL Object Type
@Entity('users')
export class User {
  @Field() // Đánh dấu trường là một GraphQL Field
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ unique: true })
  username: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ select: false })
  password: string;

  @Exclude()
  @Column()
  refreshToken: string;

  @Field(() => UserRole)
  @Column({ type: 'varchar', default: UserRole.Customer })
  role: UserRole;

  @Field(() => [CartEntity()], { nullable: true })
  @OneToMany(CartEntity, (cart: Cart) => cart.user)
  carts: Cart[];
}
