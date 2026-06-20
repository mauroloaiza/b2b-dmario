import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../../.env') });

// Better Auth — debe inicializarse antes de usarse
import { auth, pgPool } from '../auth/auth.instance';
import { Vendor } from '../vendors/vendor.entity';
import { Client } from '../clients/client.entity';
import { Product } from '../catalog/product.entity';
import { ClientSegment, ClientStatus, ProductBadge, UserRole } from '../common/enums';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'dmario_b2b',
  username: process.env.DB_USER ?? 'dmario',
  password: process.env.DB_PASS ?? 'dmario_dev_2026',
  entities: [Vendor, Client, Product],
  synchronize: true,
});

async function createUser(email: string, password: string, name: string, role: UserRole, clientId?: string, vendorId?: string) {
  return auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      role,
      ...(clientId ? { clientId } : {}),
      ...(vendorId ? { vendorId } : {}),
    },
  });
}

async function seed() {
  await ds.initialize();
  console.log("🌱 Iniciando seed D'MARIO B2B...");

  // Secuencia para códigos P-XXXX (idempotente)
  await ds.query(`CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1`);

  // Better Auth auto-migra sus tablas (user, session, account, verification)
  // Las entidades de negocio las gestiona TypeORM con synchronize:true

  // --- VENDORS ---
  const vendorRepo = ds.getRepository(Vendor);
  const vendors = await vendorRepo.save([
    { name: 'Andrés M.', zone: 'Cundinamarca · Boyacá',    meta: 80000000, real: 82100000, clientsCount: 96, activeCount: 79, email: 'andres.m@dmario.com', phone: '312 445 8890' },
    { name: 'Laura P.',  zone: 'Antioquia · Eje Cafetero', meta: 75000000, real: 68400000, clientsCount: 84, activeCount: 71, email: 'laura.p@dmario.com',  phone: '314 222 1234' },
    { name: 'Carlos R.', zone: 'Caribe',                   meta: 65000000, real: 51200000, clientsCount: 72, activeCount: 58, email: 'carlos.r@dmario.com', phone: '315 888 5678' },
    { name: 'María L.',  zone: 'Valle · Sur',              meta: 55000000, real: 49800000, clientsCount: 64, activeCount: 55, email: 'maria.l@dmario.com',  phone: '316 777 9090' },
  ]);
  console.log(`✓ ${vendors.length} vendedores`);

  const [andres, laura, carlos] = vendors;

  // --- CLIENTS ---
  const clientRepo = ds.getRepository(Client);
  const clients: Client[] = [];
  const clientData: Parameters<typeof clientRepo.create>[0][] = [
    { code: '900412337-1', name: 'Joyería La Esmeralda',  city: 'Bogotá',       segment: ClientSegment.A, creditLimit: 12000000, creditUsed: 4200000, status: ClientStatus.ACTIVO,   ytd: 48200000, vendor: andres, address: 'Cra. 7 # 24-89, local 102' },
    { code: '800111222-2', name: 'Relojería El Tiempo',    city: 'Medellín',     segment: ClientSegment.A, creditLimit: 10000000, creditUsed: 7800000, status: ClientStatus.ACTIVO,   ytd: 41800000, vendor: laura,  address: 'Calle 49 # 55-20, local 312' },
    { code: '901234567-3', name: 'Joyas Cartagena Ltda',  city: 'Cartagena',    segment: ClientSegment.A, creditLimit: 8000000,  creditUsed: 5100000, status: ClientStatus.RIESGO,   ytd: 36400000, vendor: carlos, address: 'CC Bocagrande local 45' },
    { code: '800999888-4', name: 'Distribuidora Andina',  city: 'Cali',         segment: ClientSegment.A, creditLimit: 9000000,  creditUsed: 2100000, status: ClientStatus.ACTIVO,   ytd: 32700000, vendor: laura,  address: 'Av. 6N # 23-45' },
    { code: '901122334-5', name: 'Joyería Mónaco',        city: 'Barranquilla', segment: ClientSegment.B, creditLimit: 5000000,  creditUsed: 1800000, status: ClientStatus.ACTIVO,   ytd: 18900000, vendor: andres, address: 'Calle 72 # 46-30 local 8' },
    { code: '800456789-6', name: 'Relojería Continental', city: 'Bucaramanga',  segment: ClientSegment.B, creditLimit: 4000000,  creditUsed: 3900000, status: ClientStatus.RIESGO,   ytd: 14200000, vendor: carlos, address: 'Carrera 27 # 45-12' },
    { code: '901888777-7', name: 'Tic-Tac Joyería',       city: 'Pereira',      segment: ClientSegment.B, creditLimit: 3500000,  creditUsed: 900000,  status: ClientStatus.ACTIVO,   ytd: 11800000, vendor: andres, address: 'CC Bolívar local 203' },
    { code: '800321654-8', name: 'Joyería Real',          city: 'Manizales',    segment: ClientSegment.C, creditLimit: 2000000,  creditUsed: 0,       status: ClientStatus.INACTIVO, ytd: 4200000 },
    { code: '900777111-9', name: 'El Reloj de Oro',       city: 'Ibagué',       segment: ClientSegment.C, creditLimit: 2000000,  creditUsed: 0,       status: ClientStatus.INACTIVO, ytd: 3800000 },
  ];
  for (const d of clientData) {
    clients.push(await clientRepo.save(clientRepo.create(d)));
  }
  console.log(`✓ ${clients.length} clientes`);

  // --- PRODUCTS ---
  const productRepo = ds.getRepository(Product);
  await productRepo.save([
    { ref: 'DM-2451', name: 'Lyon Acero Plata',    line: 'Lyon',   priceMayo: 619900,  packSize: 6, stock: 124, badge: ProductBadge.TOP,     active: true },
    { ref: 'DM-2455', name: 'Lyon Acero Oro Rosa', line: 'Lyon',   priceMayo: 689900,  packSize: 6, stock: 86,  badge: null,                 active: true },
    { ref: 'DM-2460', name: 'Lyon Esfera Negra',   line: 'Lyon',   priceMayo: 619900,  packSize: 6, stock: 9,   badge: ProductBadge.BAJO,    active: true },
    { ref: 'DM-3120', name: 'Geneva Cuero Café',   line: 'Geneva', priceMayo: 489900,  packSize: 6, stock: 248, badge: null,                 active: true },
    { ref: 'DM-3122', name: 'Geneva Cuero Negro',  line: 'Geneva', priceMayo: 489900,  packSize: 6, stock: 0,   badge: ProductBadge.AGOTADO, active: true },
    { ref: 'DM-3130', name: 'Geneva Dama Nácar',   line: 'Geneva', priceMayo: 519900,  packSize: 6, stock: 64,  badge: null,                 active: true },
    { ref: 'DM-4001', name: 'Zürich Crono Acero',  line: 'Zürich', priceMayo: 890000,  packSize: 4, stock: 42,  badge: ProductBadge.NUEVO,   active: true },
    { ref: 'DM-4012', name: 'Zürich Crono Negro',  line: 'Zürich', priceMayo: 890000,  packSize: 4, stock: 28,  badge: null,                 active: true },
    { ref: 'DM-5210', name: 'Alpes Automático',    line: 'Alpes',  priceMayo: 1190000, packSize: 3, stock: 18,  badge: ProductBadge.PREMIUM, active: true },
    { ref: 'DM-5215', name: 'Alpes Oro Skeleton',  line: 'Alpes',  priceMayo: 1500000, packSize: 3, stock: 11,  badge: ProductBadge.PREMIUM, active: true },
    { ref: 'DM-6020', name: 'Bern Sport Caucho',   line: 'Bern',   priceMayo: 289900,  packSize: 8, stock: 312, badge: null,                 active: true },
    { ref: 'DM-6025', name: 'Bern Sport Azul',     line: 'Bern',   priceMayo: 289900,  packSize: 8, stock: 156, badge: null,                 active: true },
  ]);
  console.log(`✓ 12 productos`);

  // --- USERS via Better Auth ---
  console.log('Creando usuarios con Better Auth...');
  await createUser('esmeralda@aliado.com', 'aliado123', 'Joyería La Esmeralda', UserRole.ALIADO, clients[0].id);
  await createUser('eltiempo@aliado.com',  'aliado123', 'Relojería El Tiempo',  UserRole.ALIADO, clients[1].id);
  await createUser('cartagena@aliado.com', 'aliado123', 'Joyas Cartagena',      UserRole.ALIADO, clients[2].id);
  await createUser('andina@aliado.com',    'aliado123', 'Distribuidora Andina', UserRole.ALIADO, clients[3].id);
  await createUser('monaco@aliado.com',    'aliado123', 'Joyería Mónaco',       UserRole.ALIADO, clients[4].id);
  await createUser('andres.m@dmario.com',  'kam123',    'Andrés M.',            UserRole.KAM,    undefined, vendors[0].id);
  await createUser('laura.p@dmario.com',   'kam123',    'Laura P.',             UserRole.KAM,    undefined, vendors[1].id);
  await createUser('carlos.r@dmario.com',  'kam123',    'Carlos R.',            UserRole.KAM,    undefined, vendors[2].id);
  await createUser('maria.l@dmario.com',   'kam123',    'María L.',             UserRole.KAM,    undefined, vendors[3].id);
  console.log(`✓ 9 usuarios (5 aliados + 4 KAMs)`);

  console.log('\n✅ Seed completado.');
  console.log('  Aliado:  esmeralda@aliado.com / aliado123');
  console.log('  KAM:     andres.m@dmario.com  / kam123');

  await ds.destroy();
  await pgPool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
