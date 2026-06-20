import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seguridad HTTP — headers seguros en todas las respuestas
  app.use(helmet());

  app.setGlobalPrefix('api');

  // CORS: en prod solo el dominio del frontend; en dev permite cualquier origen
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : true; // true = cualquier origen (solo para development)
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`D'MARIO B2B API corriendo en: http://localhost:${port}/api`);
}
bootstrap();
