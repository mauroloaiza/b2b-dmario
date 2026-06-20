import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Invoice } from './invoice.entity';
import { Product } from '../catalog/product.entity';
import { Client } from '../clients/client.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { InvoiceStatus, OrderStatus, PaymentTerm } from '../common/enums';
import { ClientsService } from '../clients/clients.service';

// Descuentos por forma de pago (sobre subtotal)
const DISCOUNT_RATE: Record<PaymentTerm, number> = {
  [PaymentTerm.CONTADO]:     0.08,
  [PaymentTerm.PRONTO_PAGO]: 0.05,
  [PaymentTerm.CREDITO_90]:  0,
};

// Días de vencimiento de factura por forma de pago
const DUE_DAYS: Record<PaymentTerm, number> = {
  [PaymentTerm.CONTADO]:     0,
  [PaymentTerm.PRONTO_PAGO]: 30,
  [PaymentTerm.CREDITO_90]:  90,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)   private readonly orderRepo:   Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo:  Repository<OrderItem>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly clientsService: ClientsService,
    private readonly dataSource: DataSource,
  ) {}

  // ── PREVIEW ──────────────────────────────────────────────────────────────
  async preview(dto: CreateOrderDto, clientId: string) {
    const { lines, subtotal, discount, total } = await this.calcTotals(dto);
    const client = await this.clientsService.findById(clientId);
    const creditAvailable = Number(client.creditLimit) - Number(client.creditUsed);
    const cupoOk = dto.paymentTerm !== PaymentTerm.CREDITO_90 || total <= creditAvailable;

    return {
      paymentTerm:     dto.paymentTerm,
      subtotal,
      discountRate:    DISCOUNT_RATE[dto.paymentTerm],
      discount,
      total,
      cupoOk,
      creditAvailable: dto.paymentTerm === PaymentTerm.CREDITO_90 ? creditAvailable : null,
      items: lines,
    };
  }

  // ── CONFIRM ───────────────────────────────────────────────────────────────
  async create(dto: CreateOrderDto, clientId: string) {
    const client = await this.clientsService.findById(clientId);
    const { lines, subtotal, discount, total } = await this.calcTotals(dto);

    // Validar cupo solo en crédito 90
    if (dto.paymentTerm === PaymentTerm.CREDITO_90) {
      const available = Number(client.creditLimit) - Number(client.creditUsed);
      if (total > available) {
        throw new BadRequestException(
          `Cupo insuficiente. Disponible: $${available.toLocaleString('es-CO')} · Pedido: $${total.toLocaleString('es-CO')}`,
        );
      }
    }

    return this.dataSource.transaction(async (em) => {
      // 1. Descontar stock y congelar precios
      for (const line of lines) {
        const product = await em.findOneByOrFail(Product, { id: line.productId });
        if (product.stock < line.qty) {
          throw new BadRequestException(`Stock insuficiente para ${product.ref} — disponible: ${product.stock}`);
        }
        await em.decrement(Product, { id: line.productId }, 'stock', line.qty);
      }

      // 2. Generar código P-XXXX
      const count = await em.count(Order);
      const code  = `P-${String(count + 1).padStart(4, '0')}`;

      // 3. Crear pedido
      const order = em.create(Order, {
        code,
        client,
        vendor: client.vendor ?? undefined,
        paymentTerm: dto.paymentTerm,
        subtotal,
        discount,
        total,
        status: OrderStatus.ALISTAMIENTO,
      });
      await em.save(Order, order);

      // 4. Crear ítems
      const items = lines.map((l) =>
        em.create(OrderItem, {
          order,
          product: { id: l.productId } as Product,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        }),
      );
      await em.save(OrderItem, items);

      // 5. Actualizar cupo usado (solo crédito 90)
      if (dto.paymentTerm === PaymentTerm.CREDITO_90) {
        await em.increment(Client, { id: clientId }, 'creditUsed', total);
      }

      // 6. Actualizar lastOrderAt y ytd del cliente
      await em.update(Client, { id: clientId }, {
        lastOrderAt: new Date(),
        ytd: () => `"ytd" + ${total}`,
      });

      // 7. Generar factura
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + DUE_DAYS[dto.paymentTerm]);

      const invoice = em.create(Invoice, {
        order,
        client,
        vendor: client.vendor ?? undefined,
        amount: total,
        dueDate: dueDate.toISOString().split('T')[0],
        status: InvoiceStatus.PENDIENTE,
      });
      await em.save(Invoice, invoice);

      return {
        orderId:     order.id,
        code:        order.code,
        paymentTerm: order.paymentTerm,
        subtotal,
        discount,
        total,
        status:      order.status,
        invoiceId:   invoice.id,
        dueDate:     invoice.dueDate,
        items:       lines,
        createdAt:   order.createdAt,
      };
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  private async calcTotals(dto: CreateOrderDto) {
    const lines: {
      productId: string; ref: string; name: string;
      qty: number; unitPrice: number; lineTotal: number;
    }[] = [];

    let subtotal = 0;

    for (const item of dto.items) {
      const product = await this.productRepo.findOneBy({ id: item.productId });
      if (!product) throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      if (!product.active) throw new BadRequestException(`Producto ${product.ref} no está activo`);

      const unitPrice = Number(product.priceMayo);
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;

      lines.push({ productId: product.id, ref: product.ref, name: product.name, qty: item.qty, unitPrice, lineTotal });
    }

    const rate     = DISCOUNT_RATE[dto.paymentTerm];
    const discount = Math.round(subtotal * rate);
    const total    = subtotal - discount;

    return { lines, subtotal, discount, total };
  }
}
