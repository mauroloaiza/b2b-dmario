import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderStatusExpand20260621000000 implements MigrationInterface {
  name = 'OrderStatusExpand20260621000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add new values (IF NOT EXISTS requires PG 9.3+)
    for (const v of ['pendiente', 'confirmado', 'alistando', 'en_ruta', 'cancelado']) {
      await queryRunner.query(
        `DO $$ BEGIN
           ALTER TYPE "public"."orders_status_enum" ADD VALUE '${v}';
         EXCEPTION WHEN duplicate_object THEN NULL;
         END $$`,
      );
    }

    // Migrate existing rows to new values
    await queryRunner.query(`UPDATE orders SET status = 'alistando' WHERE status IN ('alistamiento')`);
    await queryRunner.query(`UPDATE orders SET status = 'en_ruta'   WHERE status IN ('despacho', 'enviado')`);

    // Update column default
    await queryRunner.query(`ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'alistando'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE orders SET status = 'alistamiento' WHERE status = 'alistando'`);
    await queryRunner.query(`UPDATE orders SET status = 'despacho'     WHERE status = 'en_ruta'`);
    await queryRunner.query(`ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'alistamiento'`);
    // Note: removing PostgreSQL enum values requires recreating the type — skipped here
  }
}
