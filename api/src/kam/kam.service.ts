import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../vendors/vendor.entity';
import { Client } from '../clients/client.entity';
import { Invoice } from '../orders/invoice.entity';
import { ClientStatus, InvoiceStatus } from '../common/enums';

@Injectable()
export class KamService {
  constructor(
    @InjectRepository(Vendor)  private readonly vendorRepo:  Repository<Vendor>,
    @InjectRepository(Client)  private readonly clientRepo:  Repository<Client>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  async dashboard(vendorId: string) {
    const vendor = await this.vendorRepo.findOneBy({ id: vendorId });
    if (!vendor) throw new NotFoundException('Vendor no encontrado');

    const clients = await this.clientRepo.find({
      where: { vendor: { id: vendorId } },
      order: { ytd: 'DESC' },
    });

    const totalClients  = clients.length;
    const activeClients = clients.filter(c => c.status === ClientStatus.ACTIVO).length;
    const riskClients   = clients.filter(c => c.status === ClientStatus.RIESGO).length;

    // YTD real = suma ytd de todos los aliados del KAM
    const ytdReal = clients.reduce((s, c) => s + Number(c.ytd), 0);

    // Meta y % cumplimiento
    const meta        = Number(vendor.meta);
    const cumplimiento = meta > 0 ? Math.round((ytdReal / meta) * 100) : 0;

    // Regla 80/20: top aliados que aportan el 80% del YTD
    let acum = 0;
    let top80count = 0;
    for (const c of clients) {
      acum += Number(c.ytd);
      top80count++;
      if (ytdReal > 0 && acum / ytdReal >= 0.8) break;
    }

    // Alertas: aliados con cupo >80% usado (riesgo de bloqueo en crédito)
    const cupoAlerts = clients
      .filter(c => Number(c.creditLimit) > 0 &&
        (Number(c.creditUsed) / Number(c.creditLimit)) >= 0.8)
      .map(c => ({
        clientId:   c.id,
        name:       c.name,
        creditUsed: Number(c.creditUsed),
        creditLimit: Number(c.creditLimit),
        usedPct:    Math.round((Number(c.creditUsed) / Number(c.creditLimit)) * 100),
      }));

    // Facturas vencidas del KAM
    const today = new Date().toISOString().split('T')[0];
    const overdueCount = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.client', 'c')
      .where('c.vendor_id = :vendorId', { vendorId })
      .andWhere('inv.status = :st', { st: InvoiceStatus.VENCIDA })
      .getCount();

    return {
      vendor: {
        id:    vendor.id,
        name:  vendor.name,
        zone:  vendor.zone,
        email: vendor.email,
      },
      meta,
      ytdReal,
      cumplimiento,
      totalClients,
      activeClients,
      riskClients,
      top80: { clientCount: top80count, ofTotal: totalClients },
      cupoAlerts,
      overdueInvoices: overdueCount,
      asOf: today,
    };
  }

  // ── LISTADO DE ALIADOS ────────────────────────────────────────────────────
  async clients(
    vendorId: string,
    filter: { page: number; limit: number; status?: ClientStatus; segment?: string },
  ) {
    const { page, limit, status, segment } = filter;
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const where: Record<string, unknown> = { vendor: { id: vendorId } };
    if (status)  where['status']  = status;
    if (segment) where['segment'] = segment;

    const [data, total] = await this.clientRepo.findAndCount({
      where,
      order: { ytd: 'DESC' },
      take,
      skip,
    });

    return {
      meta: { total, page, pages: Math.ceil(total / take), limit: take },
      data: data.map(c => ({
        id:              c.id,
        code:            c.code,
        name:            c.name,
        city:            c.city,
        segment:         c.segment,
        status:          c.status,
        creditLimit:     Number(c.creditLimit),
        creditUsed:      Number(c.creditUsed),
        creditAvailable: Number(c.creditLimit) - Number(c.creditUsed),
        creditUsedPct:   Number(c.creditLimit) > 0
          ? Math.round((Number(c.creditUsed) / Number(c.creditLimit)) * 100)
          : 0,
        ytd:         Number(c.ytd),
        lastOrderAt: c.lastOrderAt ?? null,
      })),
    };
  }

  // ── COMISIONES ────────────────────────────────────────────────────────────
  async commissions(vendorId: string, filter: { year: number; month?: number }) {
    const { year, month } = filter;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.client', 'c')
      .where('c.vendor_id = :vendorId', { vendorId })
      .andWhere('inv.status = :paid', { paid: InvoiceStatus.PAGADA })
      .andWhere(`EXTRACT(YEAR FROM inv."paidAt") = :year`, { year });

    if (month) {
      qb.andWhere(`EXTRACT(MONTH FROM inv."paidAt") = :month`, { month });
    }

    const invoices = await qb
      .select(['inv.id', 'inv.amount', 'inv.commission', 'inv.paidAt', 'inv.dueDate', 'c.name'])
      .addSelect('c.name', 'clientName')
      .getRawAndEntities();

    const rows = invoices.entities.map((inv, i) => ({
      invoiceId:  inv.id,
      clientName: invoices.raw[i]?.clientName ?? null,
      amount:     Number(inv.amount),
      commission: Number(inv.commission ?? 0),
      paidAt:     inv.paidAt,
      onTime:     inv.paidAt <= new Date(inv.dueDate + 'T23:59:59Z'),
    }));

    const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
    const totalVolume     = rows.reduce((s, r) => s + r.amount, 0);

    return {
      vendorId,
      period: month ? `${year}-${String(month).padStart(2, '0')}` : String(year),
      totalInvoicesPaid: rows.length,
      totalVolume,
      totalCommission,
      rows,
    };
  }
}
