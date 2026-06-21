import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../catalog/product.entity';
import { Client } from '../clients/client.entity';
import { Order } from '../orders/order.entity';
import { Vendor } from '../vendors/vendor.entity';
import { ClientSegment, ClientStatus, OrderStatus, ProductBadge } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Client)  private clients:  Repository<Client>,
    @InjectRepository(Order)   private orders:   Repository<Order>,
    @InjectRepository(Vendor)  private vendors:  Repository<Vendor>,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Dashboard stats ────────────────────────────────────────────────────────
  async stats() {
    const [totalProducts, activeProducts, totalClients, totalOrders] = await Promise.all([
      this.products.count(),
      this.products.count({ where: { active: true } }),
      this.clients.count(),
      this.orders.count(),
    ]);

    const clientsByStatus = await this.clients
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany();

    const revenueRow = await this.orders
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .getRawOne();

    const ordersByStatus = await this.orders
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany();

    return {
      totalProducts,
      activeProducts,
      totalClients,
      totalOrders,
      totalRevenue: Number(revenueRow?.total ?? 0),
      clientsByStatus: Object.fromEntries(clientsByStatus.map(r => [r.status, Number(r.count)])),
      ordersByStatus:  Object.fromEntries(ordersByStatus.map(r => [r.status, Number(r.count)])),
    };
  }

  // ── Products ───────────────────────────────────────────────────────────────
  async listProducts(page = 1, limit = 30, line?: string, active?: boolean) {
    const qb = this.products.createQueryBuilder('p').orderBy('p.line').addOrderBy('p.ref');
    if (line)          qb.andWhere('p.line = :line', { line });
    if (active != null) qb.andWhere('p.active = :active', { active });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { meta: { total, page, pages: Math.ceil(total / limit) }, data };
  }

  async createProduct(dto: {
    ref: string; name: string; line: string; priceMayo: number;
    packSize: number; stock: number; badge?: ProductBadge; active?: boolean;
  }) {
    const p = this.products.create(dto);
    return this.products.save(p);
  }

  async updateProduct(id: string, dto: Partial<{
    name: string; line: string; priceMayo: number; packSize: number;
    stock: number; badge: ProductBadge | null; active: boolean;
  }>) {
    const p = await this.products.findOneBy({ id });
    if (!p) throw new NotFoundException('Producto no encontrado');
    Object.assign(p, dto);
    return this.products.save(p);
  }

  // ── Clients ────────────────────────────────────────────────────────────────
  async listClients(page = 1, limit = 30, status?: ClientStatus, segment?: ClientSegment) {
    const qb = this.clients
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.vendor', 'v')
      .orderBy('c.name');
    if (status)  qb.andWhere('c.status = :status', { status });
    if (segment) qb.andWhere('c.segment = :segment', { segment });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { meta: { total, page, pages: Math.ceil(total / limit) }, data };
  }

  async updateClient(id: string, dto: Partial<{
    creditLimit: number; status: ClientStatus; segment: ClientSegment; vendorId: string;
  }>) {
    const c = await this.clients.findOne({ where: { id }, relations: { vendor: true } });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    if (dto.vendorId !== undefined) {
      c.vendor = dto.vendorId
        ? (await this.vendors.findOneBy({ id: dto.vendorId })) ?? c.vendor
        : null as any;
    }
    const { vendorId: _, ...rest } = dto;
    Object.assign(c, rest);
    return this.clients.save(c);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  async listOrders(page = 1, limit = 30, status?: OrderStatus, clientId?: string) {
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.client', 'c')
      .leftJoinAndSelect('o.vendor', 'v')
      .leftJoinAndSelect('o.items',  'i')
      .orderBy('o.createdAt', 'DESC');
    if (status)   qb.andWhere('o.status = :status', { status });
    if (clientId) qb.andWhere('o.client.id = :clientId', { clientId });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { meta: { total, page, pages: Math.ceil(total / limit) }, data };
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const o = await this.orders.findOne({ where: { id }, relations: { client: true } });
    if (!o) throw new NotFoundException('Pedido no encontrado');
    o.status = status;
    const saved = await this.orders.save(o);

    if (o.client?.email) {
      this.notifications.sendStatusUpdate({
        to:         o.client.email,
        clientName: o.client.name,
        code:       o.code,
        status,
        total:      Number(o.total),
      }).catch(() => {/* fire-and-forget */});
    }

    return saved;
  }

  // ── Vendors ────────────────────────────────────────────────────────────────
  async listVendors() {
    return this.vendors.find({ order: { name: 'ASC' } });
  }
}
