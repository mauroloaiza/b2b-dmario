import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../catalog/product.entity';
import { Client } from '../clients/client.entity';
import { Order } from '../orders/order.entity';
import { Vendor } from '../vendors/vendor.entity';
import { ClientSegment, ClientStatus, OrderStatus, ProductBadge, UserRole } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { auth } from '../auth/auth.instance';

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

  // ── Stats trend ────────────────────────────────────────────────────────────
  async statsTrend() {
    const rows: { month: string; revenue: string; count: string }[] = await this.orders
      .createQueryBuilder('o')
      .select("TO_CHAR(o.created_at, 'YYYY-MM')", 'month')
      .addSelect('SUM(o.total)', 'revenue')
      .addSelect('COUNT(*)', 'count')
      .where("o.created_at >= NOW() - INTERVAL '12 months'")
      .groupBy("TO_CHAR(o.created_at, 'YYYY-MM')")
      .orderBy("TO_CHAR(o.created_at, 'YYYY-MM')", 'ASC')
      .getRawMany();
    return rows.map(r => ({ month: r.month, revenue: Number(r.revenue), count: Number(r.count) }));
  }

  // ── Products ───────────────────────────────────────────────────────────────
  async listProducts(page = 1, limit = 30, line?: string, active?: boolean, lowStock?: boolean) {
    const qb = this.products.createQueryBuilder('p').orderBy('p.line').addOrderBy('p.ref');
    if (line)             qb.andWhere('p.line = :line', { line });
    if (active != null)   qb.andWhere('p.active = :active', { active });
    if (lowStock)         qb.andWhere('p.stock < :threshold AND p.active = true', { threshold: 10 });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { meta: { total, page, pages: Math.ceil(total / limit) }, data };
  }

  async createProduct(dto: {
    ref: string; name: string; line: string; priceMayo: number;
    packSize: number; stock: number; badge?: ProductBadge; active?: boolean; imageUrl?: string;
  }) {
    const p = this.products.create(dto);
    return this.products.save(p);
  }

  async updateProduct(id: string, dto: Partial<{
    name: string; line: string; priceMayo: number; packSize: number;
    stock: number; badge: ProductBadge | null; active: boolean; imageUrl: string | null;
  }>) {
    const p = await this.products.findOneBy({ id });
    if (!p) throw new NotFoundException('Producto no encontrado');
    Object.assign(p, dto);
    return this.products.save(p);
  }

  // ── Clients ────────────────────────────────────────────────────────────────
  async createClient(dto: {
    code: string; name: string; city: string; email: string;
    segment?: ClientSegment; creditLimit?: number; vendorId?: string; address?: string;
  }) {
    const exists = await this.clients.findOneBy({ code: dto.code });
    if (exists) throw new ConflictException(`Ya existe un cliente con código ${dto.code}`);

    const client = this.clients.create({
      code:        dto.code,
      name:        dto.name,
      city:        dto.city,
      email:       dto.email,
      address:     dto.address,
      segment:     dto.segment ?? ClientSegment.C,
      creditLimit: dto.creditLimit ?? 0,
    });
    if (dto.vendorId) {
      client.vendor = (await this.vendors.findOneBy({ id: dto.vendorId })) ?? (null as any);
    }
    await this.clients.save(client);

    const tempPassword = `DM@${dto.code.replace(/\W/g, '')}2026`;
    try {
      await auth.api.signUpEmail({
        body: { email: dto.email, password: tempPassword, name: dto.name, role: UserRole.ALIADO, clientId: client.id },
      });
    } catch {
      // User may already exist in auth — continue
    }

    return { client, tempPassword };
  }

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

  // ── Intelligence 80/20 ────────────────────────────────────────────────────
  async intelligence() {
    const [allClients, vendors] = await Promise.all([
      this.clients.find({ order: { ytd: 'DESC' }, relations: { vendor: true } }),
      this.vendors.find({ order: { real: 'DESC' } }),
    ]);

    const totalRevenue = allClients.reduce((s, c) => s + Number(c.ytd), 0);
    const sorted = [...allClients].sort((a, b) => Number(b.ytd) - Number(a.ytd));

    // 80/20 split
    let cumulative = 0;
    let top20Count = 0;
    for (const c of sorted) {
      cumulative += Number(c.ytd);
      top20Count++;
      if (cumulative >= totalRevenue * 0.8) break;
    }

    // City aggregation
    const cityMap = new Map<string, number>();
    for (const c of allClients) {
      cityMap.set(c.city, (cityMap.get(c.city) ?? 0) + Number(c.ytd));
    }
    const citySales = [...cityMap.entries()]
      .map(([city, sales]) => ({ city, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 8);

    // Segmentation
    const seg = { A: 0, B: 0, C: 0 };
    const segRevenue = { A: 0, B: 0, C: 0 };
    for (const c of allClients) {
      seg[c.segment as 'A' | 'B' | 'C']++;
      segRevenue[c.segment as 'A' | 'B' | 'C'] += Number(c.ytd);
    }

    return {
      totalRevenue,
      top20Count,
      top20Revenue: sorted.slice(0, top20Count).reduce((s, c) => s + Number(c.ytd), 0),
      topClients: sorted.slice(0, 15).map(c => ({
        id: c.id, code: c.code, name: c.name, city: c.city,
        segment: c.segment, status: c.status,
        ytd: Number(c.ytd), creditLimit: Number(c.creditLimit),
        creditUsed: Number(c.creditUsed),
        vendor: c.vendor ? { name: c.vendor.name } : null,
      })),
      citySales,
      segmentation: { counts: seg, revenue: segRevenue },
      vendorScoreboard: vendors.map(v => ({
        id: v.id, name: v.name, zone: v.zone,
        meta: Number(v.meta), real: Number(v.real),
        clientsCount: v.clientsCount, activeCount: v.activeCount,
        pct: v.meta > 0 ? Math.round(Number(v.real) / Number(v.meta) * 100) : 0,
      })),
    };
  }

  // ── Treasury ──────────────────────────────────────────────────────────────
  async treasury() {
    const invoices = await this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.client', 'c')
      .leftJoinAndSelect('o.vendor', 'v')
      .where('o.total > 0')
      .orderBy('o.createdAt', 'DESC')
      .getMany();

    const now = new Date();

    const aging = [
      { bucket: 'Corriente',  label: '0 días',   min: -Infinity, max: 0   },
      { bucket: '1 – 30',     label: 'vencidos',  min: 1,         max: 30  },
      { bucket: '31 – 60',    label: 'vencidos',  min: 31,        max: 60  },
      { bucket: '61 – 90',    label: 'vencidos',  min: 61,        max: 90  },
      { bucket: '+ 90',       label: 'jurídico',  min: 91,        max: Infinity },
    ].map(b => ({ ...b, amount: 0, count: 0 }));

    const clientDebt = new Map<string, { name: string; city: string; vendorName: string; due: number; oldest: number }>();

    for (const o of invoices) {
      const daysOld = Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / 86400000);
      const bucket = aging.find(b => daysOld >= b.min && daysOld <= b.max);
      if (bucket) { bucket.amount += Number(o.total); bucket.count++; }

      if (o.client) {
        const key = o.client.id;
        const existing = clientDebt.get(key);
        if (!existing) {
          clientDebt.set(key, { name: o.client.name, city: o.client.city, vendorName: o.vendor?.name ?? '—', due: Number(o.total), oldest: daysOld });
        } else {
          existing.due += Number(o.total);
          existing.oldest = Math.max(existing.oldest, daysOld);
        }
      }
    }

    const topDeudores = [...clientDebt.entries()]
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.due - a.due)
      .slice(0, 8);

    const totalCxC = aging.reduce((s, b) => s + b.amount, 0);
    const vencida  = aging.filter(b => b.min > 0).reduce((s, b) => s + b.amount, 0);
    const dso      = totalCxC > 0 ? Math.round((aging[0].amount * 45 + aging[1].amount * 15 + aging[2].amount * 45 + aging[3].amount * 75 + aging[4].amount * 105) / totalCxC) : 0;

    return { totalCxC, vencida, dso, aging, topDeudores };
  }
}
