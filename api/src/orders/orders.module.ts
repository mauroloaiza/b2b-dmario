import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Invoice } from './invoice.entity';
import { Product } from '../catalog/product.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Invoice, Product]),
    ClientsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
