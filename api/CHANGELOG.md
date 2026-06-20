# Changelog — D'MARIO B2B API

Formato: [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)

---

## [Unreleased]

### Sprint 3 — Cuenta y cartera (próximo)
- GET /orders — historial de pedidos del aliado
- POST /orders/:id/repeat — recompra en 1 clic
- GET /invoices/me — facturas pendientes y vencidas

---

## [0.2.0] — 2026-06-20 · Sprint 2: Comprar

### Added
- `GET /api/catalog` — catálogo con filtros por línea, búsqueda libre, badge y paginación; incluye `pvpSugerido = round(priceMayo × 1.35 / 100) × 100`
- `GET /api/catalog/:id` — detalle de un producto
- `GET /api/me` — datos del aliado autenticado: cupo disponible, segmento, KAM asignado (solo rol `aliado`)
- `POST /api/orders/preview` — previsualización de pedido con descuentos y validación de cupo sin persistir
- `POST /api/orders` — confirmación de pedido en transacción atómica: valida stock, aplica descuentos, genera código `P-XXXX`, actualiza `creditUsed` y `ytd`, crea `Invoice` con vencimiento según forma de pago
- `CatalogService`, `ClientsService`, `OrdersService` — lógica de negocio separada de controladores
- DTO `CreateOrderDto` con `class-validator` (enum `PaymentTerm` + array de ítems)
- Reglas de negocio implementadas: contado −8% / pronto pago −5% / crédito 90 sin dcto + validación cupo
- Control de acceso: `/me` y `/orders/*` exigen rol `aliado`; `/catalog` cualquier sesión válida

---

## [0.1.2] — 2026-06-20 · Cierre Sprint 1 — hallazgos de QA

### Fixed
- `app.module.ts`: default de `DB_PORT` corregido de `'5432'` a `'5435'`; sin este cambio TypeORM conectaría al contenedor equivocado si `.env` no cargara
- `README.md`: nota de CSRF agregada en sección Auth — `sign-out` y `sign-up` requieren header `Origin`; se incluye ejemplo con curl

### Added
- `test-report-sprint1.docx`: informe de pruebas Sprint 1 (15/15 PASS) con evidencias, hallazgos y próximos pasos

---

## [0.1.1] — 2026-06-19 · Fixes post-Sprint 1

### Fixed
- Puerto PostgreSQL cambiado de 5432 a **5435** (`docker-compose.yml` + `.env`) para evitar conflicto con otros contenedores SMC en el mismo host
- `auth.instance.ts` ahora carga `.env` explícitamente con `dotenv.config()` antes de crear el `pgPool`; antes el pool se inicializaba con `DB_PORT=undefined` → conectaba al contenedor equivocado
- `auth.instance.ts`: `emailAndPassword.minPasswordLength` reducido a 6 para las credenciales de prueba (`kam123`)
- `auth.controller.ts`: ruta `@All('*')` → `@All('*path')` para eliminar warning de NestJS 11 / `path-to-regexp`
- Proceso de migración Better Auth documentado: ejecutar `npx @better-auth/cli migrate` antes del primer `npm run seed`

---

## [0.1.0] — 2026-06-19 · Sprint 1: Cimientos

### Added
- Proyecto NestJS 11 + TypeScript scaffoldeado
- `docker-compose.yml` con PostgreSQL 16-alpine
- `.env` y `.env.example` con variables de entorno documentadas
- Entidades TypeORM:
  - `Product` — ref, nombre, línea, precio mayorista (COP), packSize, stock, badge
  - `Client` — NIT/código, nombre, ciudad, segmento A/B/C, cupo, estado (activo/riesgo/inactivo)
  - `Vendor` — nombre, zona, meta, real vendido, email, teléfono
  - `Order` + `OrderItem` — pedido con forma de pago, totales y precio congelado por ítem
  - `Invoice` — factura con vencimiento, estado y comisión al recaudo
- Enums compartidos en `common/enums.ts`: `UserRole`, `ClientSegment`, `ClientStatus`, `ProductBadge`, `PaymentTerm`, `OrderStatus`, `InvoiceStatus`
- **Better Auth** como sistema de autenticación:
  - Sesiones por cookie (7 días)
  - Campos custom en `user`: `role`, `clientId`, `vendorId`
  - Proxy de rutas `/api/auth/*` a Better Auth handler
  - `SessionGuard` para proteger rutas NestJS
  - `@Roles()` decorator para control por rol
- Seed completo (`npm run seed`) con datos del handoff `data.jsx`:
  - 4 vendedores (Andrés M., Laura P., Carlos R., María L.)
  - 9 clientes (segmentos A/B/C, con cupos y KAM asignado)
  - 12 productos (líneas Lyon, Geneva, Zürich, Alpes, Bern)
  - 9 usuarios Better Auth (5 aliados + 4 KAMs)
- `README.md` con instrucciones de arranque, credenciales y documentación de endpoints

### Changed
- `src/app.module.ts` — configuración TypeORM sin entidad User (gestionada por Better Auth)
- `src/main.ts` — prefijo global `/api`, ValidationPipe, CORS habilitado

### Removed
- Auth basado en Passport + JWT (reemplazado por Better Auth)
- Dependencias: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcryptjs`
