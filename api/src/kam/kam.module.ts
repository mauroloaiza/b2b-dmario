import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from '../vendors/vendor.entity';
import { Client } from '../clients/client.entity';
import { Invoice } from '../orders/invoice.entity';
import { KamController } from './kam.controller';
import { KamService } from './kam.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, Client, Invoice])],
  controllers: [KamController],
  providers: [KamService],
})
export class KamModule {}
