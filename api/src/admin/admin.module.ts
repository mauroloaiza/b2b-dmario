import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../catalog/product.entity';
import { Client }  from '../clients/client.entity';
import { Order }   from '../orders/order.entity';
import { Vendor }  from '../vendors/vendor.entity';
import { AdminService }    from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Client, Order, Vendor])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
