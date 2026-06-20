import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ClientsService } from './clients.service';
import { SessionGuard, Roles } from '../auth/session.guard';
import { UserRole } from '../common/enums';

@UseGuards(SessionGuard)
@Controller('me')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Roles(UserRole.ALIADO)
  getMe(@Req() req: Request) {
    const user = (req as any).user;
    return this.service.getMe(user.clientId);
  }
}
