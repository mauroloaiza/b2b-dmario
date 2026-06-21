import {
  Column, Entity, JoinColumn, ManyToOne,
  OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientSegment, ClientStatus } from '../common/enums';
import { Vendor } from '../vendors/vendor.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // NIT o código de aliado

  @Column()
  name: string;

  @Column()
  city: string;

  @Column({ type: 'enum', enum: ClientSegment, default: ClientSegment.C })
  segment: ClientSegment;

  @Column({ type: 'bigint', default: 0 })
  creditLimit: number;

  @Column({ type: 'bigint', default: 0 })
  creditUsed: number;

  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.ACTIVO })
  status: ClientStatus;

  @Column({ type: 'bigint', default: 0 })
  ytd: number; // ventas año en curso

  @Column({ nullable: true })
  lastOrderAt: Date;

  @ManyToOne(() => Vendor, { nullable: true, eager: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  email: string;
}
