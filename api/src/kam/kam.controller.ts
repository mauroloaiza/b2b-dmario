import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { KamService } from './kam.service';
import { SessionGuard, Roles } from '../auth/session.guard';
import { ClientSegment, ClientStatus, UserRole } from '../common/enums';

@UseGuards(SessionGuard)
@Roles(UserRole.KAM)
@Controller('kam')
export class KamController {
  constructor(private readonly service: KamService) {}

  @Get('dashboard')
  dashboard(@Req() req: Request) {
    const user = (req as any).user;
    return this.service.dashboard(user.vendorId);
  }

  @Get('clients')
  clients(
    @Req() req: Request,
    @Query('page')    page    = '1',
    @Query('limit')   limit   = '50',
    @Query('status')  status?: string,
    @Query('segment') segment?: string,
  ) {
    if (status && !Object.values(ClientStatus).includes(status as ClientStatus)) {
      throw new BadRequestException(`status inválido. Valores: ${Object.values(ClientStatus).join(', ')}`);
    }
    if (segment && !Object.values(ClientSegment).includes(segment as ClientSegment)) {
      throw new BadRequestException(`segment inválido. Valores: ${Object.values(ClientSegment).join(', ')}`);
    }
    const user = (req as any).user;
    return this.service.clients(user.vendorId, {
      page:    Math.max(1, parseInt(page, 10) || 1),
      limit:   parseInt(limit, 10) || 50,
      status:  status as ClientStatus | undefined,
      segment: segment,
    });
  }

  @Get('commissions')
  commissions(
    @Req() req: Request,
    @Query('year')  year?: string,
    @Query('month') month?: string,
  ) {
    const y = parseInt(year ?? String(new Date().getFullYear()), 10);
    const m = month ? parseInt(month, 10) : undefined;
    if (m && (m < 1 || m > 12)) {
      throw new BadRequestException('month debe ser entre 1 y 12');
    }
    const user = (req as any).user;
    return this.service.commissions(user.vendorId, { year: y, month: m });
  }
}
