import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, ClientSegment, ClientStatus, OrderStatus, ProductBadge } from '../common/enums';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(SessionGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('stats')
  stats() { return this.svc.stats(); }

  // ── Products ───────────────────────────────────────────────────────────────
  @Get('products')
  listProducts(
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '30',
    @Query('line')   line?: string,
    @Query('active') active?: string,
  ) {
    return this.svc.listProducts(
      +page, +limit, line,
      active == null ? undefined : active === 'true',
    );
  }

  @Post('products')
  createProduct(@Body() dto: {
    ref: string; name: string; line: string; priceMayo: number;
    packSize: number; stock: number; badge?: ProductBadge; active?: boolean;
  }) { return this.svc.createProduct(dto); }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() dto: Partial<{
      name: string; line: string; priceMayo: number; packSize: number;
      stock: number; badge: ProductBadge | null; active: boolean;
    }>,
  ) { return this.svc.updateProduct(id, dto); }

  // ── Clients ────────────────────────────────────────────────────────────────
  @Get('clients')
  listClients(
    @Query('page')    page    = '1',
    @Query('limit')   limit   = '30',
    @Query('status')  status?: ClientStatus,
    @Query('segment') segment?: ClientSegment,
  ) { return this.svc.listClients(+page, +limit, status, segment); }

  @Patch('clients/:id')
  updateClient(
    @Param('id') id: string,
    @Body() dto: Partial<{
      creditLimit: number; status: ClientStatus; segment: ClientSegment; vendorId: string;
    }>,
  ) { return this.svc.updateClient(id, dto); }

  // ── Orders ─────────────────────────────────────────────────────────────────
  @Get('orders')
  listOrders(
    @Query('page')     page      = '1',
    @Query('limit')    limit     = '30',
    @Query('status')   status?:  OrderStatus,
    @Query('clientId') clientId?: string,
  ) { return this.svc.listOrders(+page, +limit, status, clientId); }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) { return this.svc.updateOrderStatus(id, status); }

  // ── Vendors ────────────────────────────────────────────────────────────────
  @Get('vendors')
  listVendors() { return this.svc.listVendors(); }
}
