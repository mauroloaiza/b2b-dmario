import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ProductBadge } from '../common/enums';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ref: string; // SKU ej. "DM-2451"

  @Column()
  name: string;

  @Column()
  line: string; // Lyon, Geneva, Zürich, Alpes, Bern

  @Column({ type: 'bigint' })
  priceMayo: number; // precio mayorista COP con IVA

  @Column()
  packSize: number; // unidad mínima de compra

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'enum', enum: ProductBadge, nullable: true })
  badge: ProductBadge | null;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  active: boolean;
}
