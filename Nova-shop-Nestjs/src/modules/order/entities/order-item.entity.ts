import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import type { Order } from './order.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { ColumnNumericTransformer } from 'src/common/transformers/column-numeric.transformer';

const OrderEntity = (): typeof Order => require('./order.entity').Order;

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column()
  productId: number;

  @Column()
  productName: string;

  @Column({ type: 'text' })
  productImage: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  price: number;

  @Column()
  quantity: number;

  @Column({ type: 'varchar', length: 128, default: '' })
  color: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  storage: string;

  @ManyToOne(OrderEntity, (order: Order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, { eager: true, nullable: true })
  product: Product;
}
