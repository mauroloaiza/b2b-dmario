import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus, PaymentTerm } from '../common/enums';
import { Client } from '../clients/client.entity';
import { Vendor } from '../vendors/vendor.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // P-2101

  @ManyToOne(() => Client, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Vendor, { nullable: true, eager: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'enum', enum: PaymentTerm })
  paymentTerm: PaymentTerm;

  @Column({ type: 'bigint' })
  subtotal: number;

  @Column({ type: 'bigint', default: 0 })
  discount: number;

  @Column({ type: 'bigint' })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ALISTANDO })
  status: OrderStatus;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
