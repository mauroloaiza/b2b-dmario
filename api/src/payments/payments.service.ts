import {
  BadRequestException, Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Invoice } from '../orders/invoice.entity';
import { Client } from '../clients/client.entity';
import { Vendor } from '../vendors/vendor.entity';
import { InvoiceStatus } from '../common/enums';

const COMMISSION_RATE = 0.03;
// Comisión solo si paga antes o en fecha de vencimiento
const onTime = (paidAt: Date, dueDate: string) =>
  paidAt <= new Date(dueDate + 'T23:59:59Z');

@Injectable()
export class PaymentsService {
  private readonly pubKey: string;
  private readonly privKey: string;
  private readonly integritySecret: string;
  private readonly eventsSecret: string;
  private readonly baseUrl: string;
  private readonly wompiBase: string;

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Client)  private readonly clientRepo:  Repository<Client>,
    @InjectRepository(Vendor)  private readonly vendorRepo:  Repository<Vendor>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const env = this.config.get('NODE_ENV');
    this.pubKey         = this.config.get('WOMPI_PUB_KEY', '');
    this.privKey        = this.config.get('WOMPI_PRIV_KEY', '');
    this.integritySecret = this.config.get('WOMPI_INTEGRITY_SECRET', '');
    this.eventsSecret   = this.config.get('WOMPI_EVENTS_SECRET', '');
    this.baseUrl        = this.config.get('APP_URL', 'http://localhost:3000');
    this.wompiBase      = env === 'production'
      ? 'https://checkout.wompi.co/p'
      : 'https://checkout.wompi.co/p'; // sandbox usa mismo dominio con pub_key de sandbox
  }

  // ── INICIAR PAGO ──────────────────────────────────────────────────────────
  async initPay(invoiceId: string, clientId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, client: { id: clientId } },
      relations: { order: true, client: true, vendor: true },
    });
    if (!invoice) throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
    if (invoice.status === InvoiceStatus.PAGADA) {
      throw new BadRequestException('La factura ya está pagada');
    }

    // Reutilizar ref si ya existe (idempotente), sino generar nueva
    const ref = invoice.wompiRef ?? `DMB2B-${invoice.order?.code ?? invoiceId.slice(0, 8)}-${Date.now()}`;

    // Persistir ref si es nueva
    if (!invoice.wompiRef) {
      await this.invoiceRepo.update(invoiceId, { wompiRef: ref });
    }

    const amountCents = Number(invoice.amount) * 100; // Wompi trabaja en centavos

    // Firma de integridad: SHA256(ref + amountCents + currency + integritySecret)
    const signatureStr = `${ref}${amountCents}COP${this.integritySecret}`;
    const signature = crypto.createHash('sha256').update(signatureStr).digest('hex');

    const redirectUrl = `${this.baseUrl}/api/payments/result`;

    const params = new URLSearchParams({
      'public-key':           this.pubKey || 'pub_test_CONFIGURE_WOMPI_PUB_KEY',
      'currency':             'COP',
      'amount-in-cents':      String(amountCents),
      'reference':            ref,
      'redirect-url':         redirectUrl,
      'signature:integrity':  signature,
    });

    return {
      invoiceId,
      orderCode:     invoice.order?.code ?? null,
      amount:        Number(invoice.amount),
      amountCents,
      dueDate:       invoice.dueDate,
      wompiRef:      ref,
      checkoutUrl:   `${this.wompiBase}/?${params.toString()}`,
      configured:    !!this.pubKey,
    };
  }

  // ── WEBHOOK WOMPI ─────────────────────────────────────────────────────────
  async handleWebhook(payload: Record<string, any>, signatureHeader: string) {
    // Verificar firma del webhook: SHA256(timestamp + properties + eventsSecret)
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

    const invoice = await this.invoiceRepo.findOne({
      where: { wompiRef: ref },
      relations: { client: true, vendor: true, order: true },
    });
    if (!invoice) return { received: true, action: 'ref_not_found', ref };
    if (invoice.status === InvoiceStatus.PAGADA) return { received: true, action: 'already_paid' };

    return this.dataSource.transaction(async (em) => {
      const paidAt = new Date();
      const commission = onTime(paidAt, invoice.dueDate)
        ? Math.round(Number(invoice.amount) * COMMISSION_RATE)
        : 0;

      // Actualizar factura
      await em.update(Invoice, { id: invoice.id }, {
        status:   InvoiceStatus.PAGADA,
        paidAt,
        commission,
        wompiTxId: txId,
      });

      // Decrementar creditUsed del cliente si era crédito 90
      if (invoice.order?.paymentTerm === 'credito90') {
        await em.decrement(Client, { id: invoice.client.id }, 'creditUsed', Number(invoice.amount));
      }

      return {
        received:   true,
        action:     'paid',
        invoiceId:  invoice.id,
        orderCode:  invoice.order?.code,
        amount:     Number(invoice.amount),
        paidAt,
        commission,
        onTime:     commission > 0,
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
    // Header format: "t=1234567890,v1=abc123..."
    const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
    return { timestamp: parts['t'] ?? '', checksum: parts['v1'] ?? '' };
  }
}
