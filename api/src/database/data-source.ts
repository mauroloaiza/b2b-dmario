import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     +(process.env.DB_PORT   ?? '5435'),
  database: process.env.DB_NAME     ?? 'dmario_b2b',
  username: process.env.DB_USER     ?? 'dmario',
  password: process.env.DB_PASS     ?? 'dmario_dev_2026',
  entities:   [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
