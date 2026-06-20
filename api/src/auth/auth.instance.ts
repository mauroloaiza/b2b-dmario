import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../../.env') });

import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

// Pool compartido con la app — reutiliza la conexión de TypeORM config
export const pgPool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'dmario_b2b',
  user: process.env.DB_USER ?? 'dmario',
  password: process.env.DB_PASS ?? 'dmario_dev_2026',
});

export const auth = betterAuth({
  database: pgPool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  // Campos adicionales en la tabla user de Better Auth
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'aliado',
        input: true,
      },
      clientId: {
        type: 'string',
        required: false,
        input: true,
      },
      vendorId: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
  // Sesiones duran 7 días
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: ['http://localhost:5173', 'http://localhost:3001'],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
