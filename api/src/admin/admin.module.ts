import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../catalog/product.entity';
import { Client }  from '../clients/client.entity';
import { Order }   from '../orders/order.entity';
import { Invoice } from '../orders/invoice.entity';
import { Vendor }  from '../vendors/vendor.entity';
import { AdminService }    from './admin.service';
import { AdminController } from './admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Client, Order, Invoice, Vendor]),
    NotificationsModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
