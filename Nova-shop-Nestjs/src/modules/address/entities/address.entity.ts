import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/modules/user/user.entity';

@Entity('addresses')
@Index('idx_addresses_user_id', ['userId'])
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  line1: string;

  @Column({ type: 'varchar', nullable: true })
  line2: string | null;

  @Column()
  city: string;

  @Column({ type: 'varchar', nullable: true })
  state: string | null;

  @Column()
  postalCode: string;

  @Column()
  country: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
