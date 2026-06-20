import { All, Controller, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.instance';
import type { Request, Response } from 'express';

// Better Auth maneja sus propias rutas: /api/auth/sign-in/email,
// /api/auth/sign-up/email, /api/auth/sign-out, /api/auth/get-session, etc.
@Controller('auth')
export class AuthController {
  private readonly handler = toNodeHandler(auth);

  @All('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}
