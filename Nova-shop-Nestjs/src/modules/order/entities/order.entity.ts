import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/modules/user/user.entity';
import { ColumnNumericTransformer } from 'src/common/transformers/column-numeric.transformer';
import type { OrderItem } from './order-item.entity';
import type { OrderStatusHistory } from './order-status-history.entity';
import { OrderStatus } from '../order-status.enum';

const OrderItemEntity = (): typeof OrderItem => require('./order-item.entity').OrderItem;
const OrderStatusHistoryEntity = (): typeof OrderStatusHistory =>
  require('./order-status-history.entity').OrderStatusHistory;

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  // Null for guest (not-signed-in) orders. Guests are identified by guestEmail.
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  // Email captured at guest checkout (Stripe customer_details). Null for
  // account orders, where the email lives on the linked User.
  @Column({ type: 'varchar', nullable: true })
  guestEmail: string | null;

  @Column({ unique: true })
  stripeSessionId: string;

  // ---- Money breakdown -------------------------------------------------------
  @Column('decimal', {
    precision: 10,
    scale: 2,
    default: 0,
    transformer: ColumnNumericTransformer,
  })
  subtotal: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    default: 0,
    transformer: ColumnNumericTransformer,
  })
  shippingFee: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    default: 0,
    transformer: ColumnNumericTransformer,
  })
  taxAmount: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  total: number;

  @Column({ type: 'varchar', default: OrderStatus.Processing })
  status: OrderStatus;

  // ---- Fulfillment -----------------------------------------------------------
  @Column({ type: 'varchar', nullable: true })
  trackingNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  carrier: string | null;

  // ---- Shipping address snapshot (captured at checkout) ----------------------
  @Column({ type: 'varchar', nullable: true })
  shipName: string | null;

  @Column({ type: 'varchar', nullable: true })
  shipPhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  shipLine1: string | null;

  @Column({ type: 'varchar', nullable: true })
  shipLine2: string | null;

  @Column({ type: 'varchar', nullable: true })
  shipCity: string | null;

  @Column({ type: 'varchar', nullable: true })
  shipState: string | null;

  @Column({ type: 'varchar', nullable: true })
  shipPostalCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  shipCountry: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  user: User | null;

  @OneToMany(OrderItemEntity, (orderItem: OrderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(OrderStatusHistoryEntity, (h: OrderStatusHistory) => h.order, { cascade: true })
  statusHistory: OrderStatusHistory[];
}
