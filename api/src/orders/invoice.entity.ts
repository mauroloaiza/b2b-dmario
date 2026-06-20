import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceStatus } from '../common/enums';
import { Client } from '../clients/client.entity';
import { Order } from './order.entity';
import { Vendor } from '../vendors/vendor.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { eager: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Client, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'date' })
  dueDate: string; // vencimiento

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDIENTE })
  status: InvoiceStatus;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ type: 'bigint', nullable: true })
  commission: number; // 3% al recaudo, calculado al pagar

  @CreateDateColumn()
  createdAt: Date;
}
