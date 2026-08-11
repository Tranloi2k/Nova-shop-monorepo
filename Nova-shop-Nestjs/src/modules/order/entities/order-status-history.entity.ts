import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { Order } from './order.entity';

const OrderEntity = (): typeof Order => require('./order.entity').Order;

/**
 * Append-only audit trail of every order status transition.
 */
@Entity('order_status_history')
@Index('idx_order_status_history_order_id', ['orderId'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column({ type: 'varchar', nullable: true })
  fromStatus: string | null;

  @Column()
  toStatus: string;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  /** userId of the actor (admin/staff) that made the change, if any. */
  @Column({ type: 'int', nullable: true })
  changedBy: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(OrderEntity, (order: Order) => order.statusHistory, { onDelete: 'CASCADE' })
  order: Order;
}
