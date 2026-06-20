import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from './auth.instance';
import { UserRole } from '../common/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => {
  const { SetMetadata } = require('@nestjs/common');
  return SetMetadata(ROLES_KEY, roles);
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // Convertir headers de Node a formato Headers de Web API
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers as Record<string, string>)) {
      if (value) headers.set(key, value);
    }

    const session = await auth.api.getSession({ headers });
    if (!session) throw new UnauthorizedException('Sesión inválida o expirada');

    req.user = session.user;
    req.session = session.session;

    // Validar rol si la ruta lo requiere
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const userRole = (session.user as any).role as UserRole;
    if (!requiredRoles.includes(userRole)) {
      throw new UnauthorizedException(`Se requiere rol: ${requiredRoles.join(' o ')}`);
    }

    return true;
  }
}
