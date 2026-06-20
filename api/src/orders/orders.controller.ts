import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SessionGuard, Roles } from '../auth/session.guard';
import { UserRole } from '../common/enums';

@UseGuards(SessionGuard)
@Roles(UserRole.ALIADO)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post('preview')
  preview(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.preview(dto, user.clientId);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.create(dto, user.clientId);
  }
}
