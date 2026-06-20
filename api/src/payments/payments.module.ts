import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../orders/invoice.entity';
import { Client } from '../clients/client.entity';
import { Vendor } from '../vendors/vendor.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Client, Vendor])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
