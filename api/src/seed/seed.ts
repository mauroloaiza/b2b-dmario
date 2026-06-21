import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

config({ path: join(__dirname, '../../.env') });

// Better Auth — debe inicializarse antes de usarse
import { auth, pgPool } from '../auth/auth.instance';
import { Vendor }  from '../vendors/vendor.entity';
import { Client }  from '../clients/client.entity';
import { Product } from '../catalog/product.entity';
import { ClientSegment, ClientStatus, OrderStatus, PaymentTerm, ProductBadge, UserRole } from '../common/enums';

const ds = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST ?? 'localhost',
  port:     +(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'dmario_b2b',
  username: process.env.DB_USER ?? 'dmario',
  password: process.env.DB_PASS ?? 'dmario_dev_2026',
  entities: [Vendor, Client, Product],
  synchronize: true,
});

async function createUser(email: string, password: string, name: string, role: UserRole, clientId?: string, vendorId?: string) {
  return auth.api.signUpEmail({
    body: { email, password, name, role,
      ...(clientId  ? { clientId }  : {}),
      ...(vendorId  ? { vendorId }  : {}),
    },
  });
}

/** Devuelve una Date con N días en el pasado */
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

async function seed() {
  await ds.initialize();
  console.log("🌱 Iniciando seed D'MARIO B2B...");

  await ds.query(`CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1`);

  // --- VENDORS ---
  const vendorRepo = ds.getRepository(Vendor);
  const vendors = await vendorRepo.save([
    { name: 'Andrés M.', zone: 'Cundinamarca · Boyacá',    meta: 80000000, real: 82100000, clientsCount: 96, activeCount: 79, email: 'andres.m@dmario.com', phone: '3124458890' },
    { name: 'Laura P.',  zone: 'Antioquia · Eje Cafetero', meta: 75000000, real: 68400000, clientsCount: 84, activeCount: 71, email: 'laura.p@dmario.com',  phone: '3142221234' },
    { name: 'Carlos R.', zone: 'Caribe',                   meta: 65000000, real: 51200000, clientsCount: 72, activeCount: 58, email: 'carlos.r@dmario.com', phone: '3158885678' },
    { name: 'María L.',  zone: 'Valle · Sur',              meta: 55000000, real: 49800000, clientsCount: 64, activeCount: 55, email: 'maria.l@dmario.com',  phone: '3167779090' },
  ]);
  console.log(`✓ ${vendors.length} vendedores`);

  const [andres, laura, carlos] = vendors;

  // --- CLIENTS ---
  const clientRepo = ds.getRepository(Client);
  const clients: Client[] = [];
  const clientData: Parameters<typeof clientRepo.create>[0][] = [
    { code: '900412337-1', name: 'Joyería La Esmeralda',  city: 'Bogotá',       segment: ClientSegment.A, creditLimit: 12000000, creditUsed: 4200000, status: ClientStatus.ACTIVO,   ytd: 48200000, vendor: andres, address: 'Cra. 7 # 24-89, local 102',   email: 'esmeralda@aliado.com' },
    { code: '800111222-2', name: 'Relojería El Tiempo',    city: 'Medellín',     segment: ClientSegment.A, creditLimit: 10000000, creditUsed: 7800000, status: ClientStatus.ACTIVO,   ytd: 41800000, vendor: laura,  address: 'Calle 49 # 55-20, local 312', email: 'eltiempo@aliado.com'  },
    { code: '901234567-3', name: 'Joyas Cartagena Ltda',  city: 'Cartagena',    segment: ClientSegment.A, creditLimit: 8000000,  creditUsed: 5100000, status: ClientStatus.RIESGO,   ytd: 36400000, vendor: carlos, address: 'CC Bocagrande local 45',      email: 'cartagena@aliado.com' },
    { code: '800999888-4', name: 'Distribuidora Andina',  city: 'Cali',         segment: ClientSegment.A, creditLimit: 9000000,  creditUsed: 2100000, status: ClientStatus.ACTIVO,   ytd: 32700000, vendor: laura,  address: 'Av. 6N # 23-45',              email: 'andina@aliado.com'    },
    { code: '901122334-5', name: 'Joyería Mónaco',        city: 'Barranquilla', segment: ClientSegment.B, creditLimit: 5000000,  creditUsed: 1800000, status: ClientStatus.ACTIVO,   ytd: 18900000, vendor: andres, address: 'Calle 72 # 46-30 local 8',    email: 'monaco@aliado.com'    },
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
  const products = await productRepo.save([
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

  // --- HISTORICAL ORDERS (para recompra inteligente) ---
  // Usar raw SQL para controlar created_at con fechas pasadas
  const [lyon, lyonOro, , genevaCafe, , genevaNacar, zurich, , , , bern, bernAzul] = products;

  // Patrón de compra por cliente: [clientIdx, productId, qty, daysAgo, paymentTerm, status]
  const historicalOrders: Array<{
    clientIdx: number;
    lines: { product: Product; qty: number }[];
    daysAgo: number;
    paymentTerm: PaymentTerm;
    status: OrderStatus;
  }> = [
    // Joyería La Esmeralda — ciclo ~18 días en Lyon + Geneva
    { clientIdx: 0, lines: [{ product: lyon, qty: 12 }, { product: genevaCafe, qty: 6 }],   daysAgo: 108, paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ENTREGADO },
    { clientIdx: 0, lines: [{ product: lyon, qty: 12 }, { product: genevaNacar, qty: 6 }],  daysAgo: 90,  paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ENTREGADO },
    { clientIdx: 0, lines: [{ product: lyon, qty: 6 },  { product: bern, qty: 8 }],         daysAgo: 72,  paymentTerm: PaymentTerm.PRONTO_PAGO, status: OrderStatus.ENTREGADO },
    { clientIdx: 0, lines: [{ product: lyon, qty: 12 }, { product: genevaCafe, qty: 12 }],  daysAgo: 54,  paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ENTREGADO },
    { clientIdx: 0, lines: [{ product: lyon, qty: 12 }, { product: lyonOro, qty: 6 }],      daysAgo: 36,  paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ENTREGADO },
    { clientIdx: 0, lines: [{ product: lyon, qty: 12 }, { product: bern, qty: 16 }],        daysAgo: 18,  paymentTerm: PaymentTerm.CONTADO,    status: OrderStatus.EN_RUTA   },

    // Relojería El Tiempo — ciclo ~21 días en Geneva + Zürich
    { clientIdx: 1, lines: [{ product: genevaCafe, qty: 12 }, { product: zurich, qty: 4 }], daysAgo: 105, paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ENTREGADO },
    { clientIdx: 1, lines: [{ product: genevaCafe, qty: 6 },  { product: zurich, qty: 4 }], daysAgo: 84,  paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ENTREGADO },
    { clientIdx: 1, lines: [{ product: genevaCafe, qty: 12 }, { product: genevaNacar, qty: 6 }], daysAgo: 63, paymentTerm: PaymentTerm.PRONTO_PAGO, status: OrderStatus.ENTREGADO },
    { clientIdx: 1, lines: [{ product: genevaCafe, qty: 12 }, { product: zurich, qty: 8 }], daysAgo: 42,  paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ENTREGADO },
    { clientIdx: 1, lines: [{ product: genevaCafe, qty: 12 }, { product: bernAzul, qty: 8 }],daysAgo: 21, paymentTerm: PaymentTerm.CREDITO_90, status: OrderStatus.ALISTANDO },

    // Distribuidora Andina — ciclo ~28 días en Bern + Lyon
    { clientIdx: 3, lines: [{ product: bern, qty: 16 }, { product: lyon, qty: 6 }],          daysAgo: 112, paymentTerm: PaymentTerm.CONTADO, status: OrderStatus.ENTREGADO },
    { clientIdx: 3, lines: [{ product: bern, qty: 24 }, { product: bernAzul, qty: 8 }],      daysAgo: 84,  paymentTerm: PaymentTerm.CONTADO, status: OrderStatus.ENTREGADO },
    { clientIdx: 3, lines: [{ product: bern, qty: 16 }, { product: lyon, qty: 12 }],         daysAgo: 56,  paymentTerm: PaymentTerm.CONTADO, status: OrderStatus.ENTREGADO },
    { clientIdx: 3, lines: [{ product: bern, qty: 24 }, { product: genevaCafe, qty: 6 }],    daysAgo: 28,  paymentTerm: PaymentTerm.CONTADO, status: OrderStatus.EN_RUTA   },

    // Joyería Mónaco — ciclo ~30 días en Geneva + Alpes
    { clientIdx: 4, lines: [{ product: genevaNacar, qty: 6 }],                               daysAgo: 90,  paymentTerm: PaymentTerm.PRONTO_PAGO, status: OrderStatus.ENTREGADO },
    { clientIdx: 4, lines: [{ product: genevaNacar, qty: 6 }, { product: genevaCafe, qty: 6 }], daysAgo: 60, paymentTerm: PaymentTerm.PRONTO_PAGO, status: OrderStatus.ENTREGADO },
    { clientIdx: 4, lines: [{ product: genevaNacar, qty: 6 }, { product: bern, qty: 8 }],    daysAgo: 30,  paymentTerm: PaymentTerm.PRONTO_PAGO, status: OrderStatus.ENTREGADO },
  ];

  let orderNum = 1000;
  for (const o of historicalOrders) {
    const client  = clients[o.clientIdx];
    const subtotal = o.lines.reduce((s, l) => s + Number(l.product.priceMayo) * l.qty, 0);
    const discountRate = o.paymentTerm === PaymentTerm.CONTADO ? 0.08 : o.paymentTerm === PaymentTerm.PRONTO_PAGO ? 0.05 : 0;
    const discount = Math.round(subtotal * discountRate);
    const total    = subtotal - discount;
    const orderId  = uuid();
    const code     = `P-${String(orderNum++).padStart(4, '0')}`;
    const orderDate = daysAgo(o.daysAgo);
    const vendorId  = client.vendor?.id ?? null;

    await ds.query(
      `INSERT INTO orders (id, code, client_id, vendor_id, payment_term, subtotal, discount, total, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [orderId, code, client.id, vendorId, o.paymentTerm, subtotal, discount, total, o.status, orderDate],
    );

    for (const line of o.lines) {
      await ds.query(
        `INSERT INTO order_items (id, order_id, product_id, qty, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuid(), orderId, line.product.id, line.qty, Number(line.product.priceMayo), Number(line.product.priceMayo) * line.qty],
      );
    }
  }
  console.log(`✓ ${historicalOrders.length} pedidos históricos (recompra seed)`);

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
  await createUser('admin@dmario.com',     'admin2026', 'Admin D\'MARIO',       UserRole.ADMIN);
  console.log(`✓ 10 usuarios (5 aliados + 4 KAMs + 1 admin)`);

  console.log('\n✅ Seed completado.');
  console.log('  Aliado:  esmeralda@aliado.com / aliado123');
  console.log('  KAM:     andres.m@dmario.com  / kam123');
  console.log('  Admin:   admin@dmario.com     / admin2026');

  await ds.destroy();
  await pgPool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
