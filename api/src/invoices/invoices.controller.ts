import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { InvoicesService } from './invoices.service';
import { SessionGuard, Roles } from '../auth/session.guard';
import { InvoiceStatus, UserRole } from '../common/enums';

@UseGuards(SessionGuard)
@Roles(UserRole.ALIADO)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get('me')
  getMe(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    if (status && !Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      throw new BadRequestException(`status inválido. Valores: ${Object.values(InvoiceStatus).join(', ')}`);
    }
    const user = (req as any).user;
    return this.service.findByClient(user.clientId, {
      page:  Math.max(1, parseInt(page, 10) || 1),
      limit: parseInt(limit, 10) || 20,
      status: status as InvoiceStatus | undefined,
    });
  }
}
