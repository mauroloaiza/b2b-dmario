import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SessionGuard, Roles } from '../auth/session.guard';
import { OrderStatus, UserRole } from '../common/enums';

@UseGuards(SessionGuard)
@Roles(UserRole.ALIADO)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException(`status inválido. Valores: ${Object.values(OrderStatus).join(', ')}`);
    }
    const user = (req as any).user;
    return this.service.findByClient(user.clientId, {
      page:   Math.max(1, parseInt(page, 10) || 1),
      limit:  parseInt(limit, 10) || 20,
      status: status as OrderStatus | undefined,
    });
  }

  @Get('recompra')
  recompra(@Req() req: Request) {
    const user = (req as any).user;
    return this.service.recompra(user.clientId);
  }

  @Post('preview')
  preview(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.preview(dto, user.clientId);
  }

  @Post(':id/repeat')
  repeat(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.repeat(id, user.clientId);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.create(dto, user.clientId);
  }
}
