import { MigrationInterface, QueryRunner } from 'typeorm';

// Baseline migration — schema capturado de synchronize:true en desarrollo (Sprint 5).
// En producción este schema se crea con esta migración; en desarrollo ya existe.
export class InitialSchema20260620164610 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE public.clients_segment_enum AS ENUM ('A', 'B', 'C');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE public.clients_status_enum AS ENUM ('activo', 'inactivo', 'riesgo');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE public.orders_paymentterm_enum AS ENUM ('contado', 'pronto_30', 'credito_90');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE public.orders_status_enum AS ENUM ('alistamiento', 'enviado', 'entregado', 'cancelado');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE public.invoices_status_enum AS ENUM ('pendiente', 'vencida', 'pagada');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE public.products_badge_enum AS ENUM ('nuevo', 'top', 'liquidacion');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.vendors (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        name character varying NOT NULL,
        zone character varying NOT NULL,
        meta bigint DEFAULT 0 NOT NULL,
        "real" bigint DEFAULT 0 NOT NULL,
        "clientsCount" integer DEFAULT 0 NOT NULL,
        "activeCount" integer DEFAULT 0 NOT NULL,
        email character varying NOT NULL,
        phone character varying,
        CONSTRAINT "PK_vendors" PRIMARY KEY (id),
        CONSTRAINT "UQ_vendors_email" UNIQUE (email)
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.clients (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        code character varying NOT NULL,
        name character varying NOT NULL,
        city character varying NOT NULL,
        segment public.clients_segment_enum DEFAULT 'C' NOT NULL,
        "creditLimit" bigint DEFAULT 0 NOT NULL,
        "creditUsed" bigint DEFAULT 0 NOT NULL,
        status public.clients_status_enum DEFAULT 'activo' NOT NULL,
        ytd bigint DEFAULT 0 NOT NULL,
        "lastOrderAt" timestamp without time zone,
        address character varying,
        vendor_id uuid,
        CONSTRAINT "PK_clients" PRIMARY KEY (id),
        CONSTRAINT "UQ_clients_code" UNIQUE (code),
        CONSTRAINT "FK_clients_vendor" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.products (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        ref character varying NOT NULL,
        name character varying NOT NULL,
        line character varying NOT NULL,
        "priceMayo" bigint NOT NULL,
        "packSize" integer NOT NULL,
        stock integer DEFAULT 0 NOT NULL,
        badge public.products_badge_enum,
        "imageUrl" character varying,
        active boolean DEFAULT true NOT NULL,
        CONSTRAINT "PK_products" PRIMARY KEY (id),
        CONSTRAINT "UQ_products_ref" UNIQUE (ref)
      )`);

    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS public.order_code_seq START 1`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.orders (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        code character varying NOT NULL,
        "paymentTerm" public.orders_paymentterm_enum NOT NULL,
        subtotal bigint NOT NULL,
        discount bigint DEFAULT 0 NOT NULL,
        total bigint NOT NULL,
        status public.orders_status_enum DEFAULT 'alistamiento' NOT NULL,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        client_id uuid,
        vendor_id uuid,
        CONSTRAINT "PK_orders" PRIMARY KEY (id),
        CONSTRAINT "UQ_orders_code" UNIQUE (code),
        CONSTRAINT "FK_orders_client" FOREIGN KEY (client_id) REFERENCES public.clients(id),
        CONSTRAINT "FK_orders_vendor" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.order_items (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        qty integer NOT NULL,
        "unitPrice" bigint NOT NULL,
        "lineTotal" bigint NOT NULL,
        order_id uuid,
        product_id uuid,
        CONSTRAINT "PK_order_items" PRIMARY KEY (id),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY (order_id) REFERENCES public.orders(id),
        CONSTRAINT "FK_order_items_product" FOREIGN KEY (product_id) REFERENCES public.products(id)
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.invoices (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        amount bigint NOT NULL,
        "dueDate" date NOT NULL,
        status public.invoices_status_enum DEFAULT 'pendiente' NOT NULL,
        "paidAt" timestamp without time zone,
        commission bigint,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        "wompiRef" character varying,
        "wompiTxId" character varying,
        order_id uuid,
        client_id uuid,
        vendor_id uuid,
        CONSTRAINT "PK_invoices" PRIMARY KEY (id),
        CONSTRAINT "UQ_invoices_wompiRef" UNIQUE ("wompiRef"),
        CONSTRAINT "FK_invoices_order" FOREIGN KEY (order_id) REFERENCES public.orders(id),
        CONSTRAINT "FK_invoices_client" FOREIGN KEY (client_id) REFERENCES public.clients(id),
        CONSTRAINT "FK_invoices_vendor" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.order_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.orders`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS public.order_code_seq`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.products`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.clients`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.vendors`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.products_badge_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.invoices_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.orders_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.orders_paymentterm_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.clients_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.clients_segment_enum`);
  }
}
