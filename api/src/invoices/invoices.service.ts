import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../orders/invoice.entity';
import { InvoiceStatus } from '../common/enums';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly repo: Repository<Invoice>,
  ) {}

  async findByClient(clientId: string, filter: { page: number; limit: number; status?: InvoiceStatus }) {
    const { page, limit, status } = filter;
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    // Auto-mark vencidas: facturas pendientes con dueDate < hoy
    const today = new Date().toISOString().split('T')[0];
    await this.repo
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: InvoiceStatus.VENCIDA })
      .where('client_id = :clientId', { clientId })
      .andWhere('status = :pending', { pending: InvoiceStatus.PENDIENTE })
      .andWhere('"dueDate" < :today', { today })
      .execute();

    const where: Record<string, unknown> = { client: { id: clientId } };
    if (status) where['status'] = status;

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { order: true },
      order: { dueDate: 'ASC' },
      take,
      skip,
    });

    return {
      meta: { total, page, pages: Math.ceil(total / take), limit: take },
      data: data.map((inv) => this.toDto(inv, today)),
    };
  }

  private toDto(inv: Invoice, today: string) {
    const daysOverdue = inv.status === InvoiceStatus.VENCIDA
      ? Math.floor((new Date(today).getTime() - new Date(inv.dueDate).getTime()) / 86_400_000)
      : 0;

    return {
      id:          inv.id,
      orderCode:   inv.order?.code ?? null,
      amount:      Number(inv.amount),
      dueDate:     inv.dueDate,
      status:      inv.status,
      daysOverdue,
      paidAt:      inv.paidAt ?? null,
    };
  }
}
