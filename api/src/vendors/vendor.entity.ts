import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  zone: string;

  @Column({ type: 'bigint', default: 0 })
  meta: number;

  @Column({ type: 'bigint', default: 0 })
  real: number;

  @Column({ default: 0 })
  clientsCount: number;

  @Column({ default: 0 })
  activeCount: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;
}
