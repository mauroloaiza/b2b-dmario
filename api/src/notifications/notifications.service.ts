import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const STATUS_MSG: Record<string, { label: string; detail: string }> = {
  confirmado: { label: 'Pedido confirmado',  detail: 'Recibimos tu pedido y lo estamos procesando.' },
  alistando:  { label: 'En alistamiento',    detail: 'Estamos preparando tu pedido con cuidado.' },
  en_ruta:    { label: 'En camino',          detail: 'Tu pedido salió de bodega y está en camino.' },
  entregado:  { label: '¡Entregado!',        detail: 'Tu pedido llegó. ¡Gracias por confiar en D\'MARIO!' },
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly log = new Logger(NotificationsService.name);
  private transporter: Transporter;
  private from: string;

  async onModuleInit() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   +(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.from = process.env.MAIL_FROM ?? 'pedidos@dmario.com';
      this.log.log(`Mailer listo — SMTP ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    } else {
      // Dev: Ethereal test account (no sale correo real, se loggea URL de preview)
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.from = `"D'MARIO B2B" <${testAccount.user}>`;
      this.log.log(`Mailer dev — Ethereal ${testAccount.user}`);
    }
  }

  async sendOrderConfirmed(params: {
    to:          string;
    clientName:  string;
    code:        string;
    paymentTerm: string;
    items:       { ref: string; name: string; qty: number; lineTotal: number }[];
    subtotal:    number;
    discount:    number;
    total:       number;
    dueDate?:    string;
  }) {
    const { to, clientName, code, paymentTerm, items, subtotal, discount, total, dueDate } = params;

    const itemRows = items.map(it =>
      `<tr>
        <td style="padding:6px 12px;color:#555">${it.ref} — ${it.name}</td>
        <td style="padding:6px 12px;text-align:center;color:#555">×${it.qty}</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600">${cop(it.lineTotal)}</td>
      </tr>`
    ).join('');

    const termLabel: Record<string, string> = {
      contado: 'Contado (8% descuento)', pronto_pago: 'Pronto pago 30 días (5%)', credito90: 'Crédito 90 días',
    };

    const html = layout(`
      <h2 style="color:#183029;margin:0 0 4px">Pedido confirmado</h2>
      <p style="color:#666;margin:0 0 24px">Hola <strong>${clientName}</strong>, recibimos tu pedido.</p>

      <div style="background:#f4f2ec;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <span style="font-size:22px;font-weight:700;color:#183029">${code}</span>
        <span style="margin-left:12px;color:#888;font-size:13px">${termLabel[paymentTerm] ?? paymentTerm}</span>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr style="background:#183029;color:#f4f2ec;font-size:12px;text-transform:uppercase">
            <th style="padding:8px 12px;text-align:left">Producto</th>
            <th style="padding:8px 12px;text-align:center">Cant.</th>
            <th style="padding:8px 12px;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          ${discount > 0 ? `<tr><td colspan="2" style="padding:6px 12px;color:#888">Descuento</td><td style="padding:6px 12px;text-align:right;color:#e75300">−${cop(discount)}</td></tr>` : ''}
          <tr style="border-top:2px solid #183029">
            <td colspan="2" style="padding:8px 12px;font-weight:700">Total</td>
            <td style="padding:8px 12px;text-align:right;font-size:18px;font-weight:700;color:#183029">${cop(total)}</td>
          </tr>
        </tfoot>
      </table>

      ${dueDate ? `<p style="color:#666;font-size:13px">Vencimiento factura: <strong>${dueDate}</strong></p>` : ''}

      <p style="color:#666;font-size:13px;margin-top:24px">Tu pedido está en alistamiento. Te avisaremos cuando salga de bodega.</p>
    `);

    await this.send(to, `Pedido ${code} confirmado — D'MARIO Mayorista`, html);
  }

  async sendStatusUpdate(params: {
    to:         string;
    clientName: string;
    code:       string;
    status:     string;
    total:      number;
  }) {
    const { to, clientName, code, status, total } = params;
    const s = STATUS_MSG[status] ?? { label: status, detail: '' };

    const html = layout(`
      <h2 style="color:#183029;margin:0 0 4px">Actualización de pedido</h2>
      <p style="color:#666;margin:0 0 24px">Hola <strong>${clientName}</strong>.</p>

      <div style="background:#f4f2ec;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
        <p style="margin:0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px">Pedido</p>
        <p style="margin:4px 0 8px;font-size:24px;font-weight:700;color:#183029">${code}</p>
        <span style="background:#183029;color:#f4f2ec;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600">${s.label}</span>
      </div>

      <p style="color:#555;font-size:15px;text-align:center">${s.detail}</p>
      <p style="color:#888;font-size:13px;text-align:center">Total del pedido: <strong>${cop(total)}</strong></p>
    `);

    await this.send(to, `Pedido ${code} — ${s.label} · D'MARIO`, html);
  }

  private async send(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({ from: this.from, to, subject, html });
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) this.log.log(`Preview email → ${preview}`);
      else         this.log.log(`Email enviado a ${to} — ${subject}`);
    } catch (err) {
      this.log.error(`Error enviando email a ${to}: ${err}`);
    }
  }
}

function layout(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#eee;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eee;padding:32px 0">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr>
          <td style="background:#183029;padding:20px 32px">
            <span style="color:#f4f2ec;font-size:20px;font-weight:700;letter-spacing:2px">D'MARIO</span>
            <span style="color:#c2b97a;font-size:11px;margin-left:8px;letter-spacing:1px">MAYORISTA B2B</span>
          </td>
        </tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr>
          <td style="background:#f4f2ec;padding:16px 32px;text-align:center">
            <p style="margin:0;color:#888;font-size:12px">D'MARIO Mayorista · Joyería y Relojería · Colombia</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
