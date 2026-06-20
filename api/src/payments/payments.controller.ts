import {
  Body, Controller, Get, Headers, Param, Post, RawBodyRequest, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { SessionGuard, Roles } from '../auth/session.guard';
import { UserRole } from '../common/enums';

@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // Iniciar pago — solo aliado autenticado
  @UseGuards(SessionGuard)
  @Roles(UserRole.ALIADO)
  @Post('invoices/:id/pay')
  initPay(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.initPay(id, user.clientId);
  }

  // Detalle de factura — solo aliado autenticado
  @UseGuards(SessionGuard)
  @Roles(UserRole.ALIADO)
  @Get('invoices/:id')
  getOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.getOne(id, user.clientId);
  }

  // Webhook Wompi — sin autenticación, verificado por firma
  @Post('webhooks/wompi')
  webhook(
    @Body() body: Record<string, any>,
    @Headers('x-event-checksum') sig: string,
  ) {
    return this.service.handleWebhook(body, sig ?? '');
  }

  // Redirect de retorno Wompi (landing page mínima)
  @Get('payments/result')
  result(@Req() req: Request) {
    const q = (req as any).query;
    return {
      message: 'Pago procesado. Revisa el estado de tu factura en /api/invoices/me',
      reference: q['id'] ?? null,
      status:    q['status'] ?? null,
    };
  }
}
