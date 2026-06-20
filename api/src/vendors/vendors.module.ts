import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor])],
  exports: [TypeOrmModule],
})
export class VendorsModule {}
