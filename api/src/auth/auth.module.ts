import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
