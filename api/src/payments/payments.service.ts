import {
  BadRequestException, Injectable, NotFoundException,
  ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Invoice } from '../orders/invoice.entity';
import { Client } from '../clients/client.entity';
import { Vendor } from '../vendors/vendor.entity';
import { InvoiceStatus, PaymentTerm } from '../common/enums';

const COMMISSION_RATE = 0.03;
const onTime = (paidAt: Date, dueDate: string) =>
  paidAt <= new Date(dueDate + 'T23:59:59Z');

@Injectable()
export class PaymentsService {
  private readonly pubKey: string;
  private readonly integritySecret: string;
  private readonly eventsSecret: string;
  private readonly baseUrl: string;
  private readonly wompiBase = 'https://checkout.wompi.co/p';

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Client)  private readonly clientRepo:  Repository<Client>,
    @InjectRepository(Vendor)  private readonly vendorRepo:  Repository<Vendor>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.pubKey          = this.config.get('WOMPI_PUB_KEY', '');
    this.integritySecret = this.config.get('WOMPI_INTEGRITY_SECRET', '');
    this.eventsSecret    = this.config.get('WOMPI_EVENTS_SECRET', '');
    this.baseUrl         = this.config.get('APP_URL', 'http://localhost:3000');
  }

  // ── INICIAR PAGO ──────────────────────────────────────────────────────────
  async initPay(invoiceId: string, clientId: string) {
    // F-A: fallar antes de generar URL inútil si Wompi no está configurado
    if (!this.pubKey || !this.integritySecret) {
      throw new ServiceUnavailableException(
        'Pasarela de pagos no configurada. Contacta a soporte.',
      );
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, client: { id: clientId } },
      relations: { order: true, client: true, vendor: true },
    });
    if (!invoice) throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
    if (invoice.status === InvoiceStatus.PAGADA) {
      throw new BadRequestException('La factura ya está pagada');
    }

    // F-B: UUID corto en lugar de timestamp para evitar colisiones en concurrencia
    const ref = invoice.wompiRef
      ?? `DMB2B-${invoice.order?.code ?? invoiceId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;

    if (!invoice.wompiRef) {
      await this.invoiceRepo.update(invoiceId, { wompiRef: ref });
    }

    const amountCents = Number(invoice.amount) * 100;
    const signatureStr = `${ref}${amountCents}COP${this.integritySecret}`;
    const signature = crypto.createHash('sha256').update(signatureStr).digest('hex');

    const params = new URLSearchParams({
      'public-key':          this.pubKey,
      'currency':            'COP',
      'amount-in-cents':     String(amountCents),
      'reference':           ref,
      'redirect-url':        `${this.baseUrl}/api/payments/result`,
      'signature:integrity': signature,
    });

    return {
      invoiceId,
      orderCode:   invoice.order?.code ?? null,
      amount:      Number(invoice.amount),
      amountCents,
      dueDate:     invoice.dueDate,
      wompiRef:    ref,
      checkoutUrl: `${this.wompiBase}/?${params.toString()}`,
    };
  }

  // ── WEBHOOK WOMPI ─────────────────────────────────────────────────────────
  async handleWebhook(payload: Record<string, any>, signatureHeader: string) {
    if (this.eventsSecret) {
      const { timestamp, checksum } = this.parseWompiSignature(signatureHeader);
      const toSign = `${timestamp}${JSON.stringify(payload)}${this.eventsSecret}`;
      const expected = crypto.createHash('sha256').update(toSign).digest('hex');
      if (expected !== checksum) {
        throw new UnauthorizedException('Firma Wompi inválida');
      }
    }

    const event = payload?.event;
    if (event !== 'transaction.updated') return { received: true, action: 'ignored' };

    const tx = payload?.data?.transaction;
    if (!tx || tx.status !== 'APPROVED') return { received: true, action: 'not_approved' };

    const ref: string = tx.reference;
    const txId: string = tx.id;

    // F-C: gate atómico — UPDATE … WHERE status = pendiente/vencida devuelve affected=0 si ya pagada
    const paidAt = new Date();
    const gate = await this.invoiceRepo
      .createQueryBuilder()
      .update(Invoice)
      .set({ wompiTxId: txId })
      .where('wompiRef = :ref', { ref })
      .andWhere('status IN (:...payable)', {
        payable: [InvoiceStatus.PENDIENTE, InvoiceStatus.VENCIDA],
      })
      .returning('id, amount, "dueDate", client_id, order_id')
      .execute();

    if (gate.affected === 0) {
      // ref no existe O ya estaba pagada — ambos son idempotentes
      const exists = await this.invoiceRepo.existsBy({ wompiRef: ref });
      return { received: true, action: exists ? 'already_paid' : 'ref_not_found', ref };
    }

    // Cargar la factura completa para calcular comisión y actualizar cliente
    const invoice = await this.invoiceRepo.findOneOrFail({
      where: { wompiRef: ref },
      relations: { client: true, order: true },
    });

    return this.dataSource.transaction(async (em) => {
      const commission = onTime(paidAt, invoice.dueDate)
        ? Math.round(Number(invoice.amount) * COMMISSION_RATE)
        : 0;

      await em.update(Invoice, { id: invoice.id }, {
        status: InvoiceStatus.PAGADA,
        paidAt,
        commission,
      });

      // Liberar cupo solo en crédito 90 (con floor en 0 para evitar negativos)
      if (invoice.order?.paymentTerm === PaymentTerm.CREDITO_90) {
        await em.query(
          `UPDATE clients SET "creditUsed" = GREATEST(0, "creditUsed" - $1) WHERE id = $2`,
          [Number(invoice.amount), invoice.client.id],
        );
      }

      return {
        received:  true,
        action:    'paid',
        invoiceId: invoice.id,
        orderCode: invoice.order?.code,
        amount:    Number(invoice.amount),
        paidAt,
        commission,
        onTime:    commission > 0,
      };
    });
  }

  // ── DETALLE FACTURA ────────────────────────────────────────────────────────
  async getOne(invoiceId: string, clientId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, client: { id: clientId } },
      relations: { order: true, vendor: true },
    });
    if (!invoice) throw new NotFoundException(`Factura ${invoiceId} no encontrada`);

    const today = new Date().toISOString().split('T')[0];
    const daysOverdue = invoice.status === InvoiceStatus.VENCIDA
      ? Math.floor((new Date(today).getTime() - new Date(invoice.dueDate).getTime()) / 86_400_000)
      : 0;

    return {
      id:          invoice.id,
      orderCode:   invoice.order?.code ?? null,
      paymentTerm: invoice.order?.paymentTerm ?? null,
      amount:      Number(invoice.amount),
      dueDate:     invoice.dueDate,
      status:      invoice.status,
      daysOverdue,
      paidAt:      invoice.paidAt ?? null,
      commission:  invoice.commission ? Number(invoice.commission) : null,
      wompiRef:    invoice.wompiRef ?? null,
      wompiTxId:   invoice.wompiTxId ?? null,
      vendor:      invoice.vendor
        ? { id: invoice.vendor.id, name: invoice.vendor.name }
        : null,
    };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  private parseWompiSignature(header: string): { timestamp: string; checksum: string } {
    const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
    return { timestamp: parts['t'] ?? '', checksum: parts['v1'] ?? '' };
  }
}
