# Changelog — D'MARIO B2B API

Formato: [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)

---

## [Unreleased]

---

## [0.6.0] — 2026-06-20 · Sprint 6: Infraestructura de Producción

### Added
- `GET /api/health` — liveness + readiness con ping de DB (`@nestjs/terminus`)
- `Dockerfile` multi-stage (builder + producción con usuario no-root `dmario`)
- `docker-compose.prod.yml` — orquestación completa API + PostgreSQL con healthchecks
- `api/.dockerignore` — excluye `.env`, `node_modules`, `dist`, logs
- `src/database/data-source.ts` — DataSource separado para CLI de migrations
- `src/database/migrations/20260620164610-InitialSchema.ts` — migración baseline del schema Sprint 5
- Scripts npm: `migration:generate`, `migration:run`, `migration:revert`, `migration:show`
- Rate limiting global vía `@nestjs/throttler` (120 req / 60 s por IP, configurable via env)
- `THROTTLE_TTL` y `THROTTLE_LIMIT` en `.env.example`
- `CORS_ORIGINS` en `.env.example` para lista blanca de orígenes en producción

### Changed
- `main.ts`: Helmet activado (headers de seguridad HTTP), CORS configurable via `CORS_ORIGINS`
- `app.module.ts`: TypeORM con `synchronize: false` en producción; migrations path registrado; ThrottlerModule global
- `.env.example`: documentadas todas las variables de entorno incluyendo las de prod

### Security
- Helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.
- Rate limiting: 403 automático al superar el límite (ThrottlerGuard global)
- Docker: imagen de producción corre con usuario no-root
- `synchronize: false` en NODE_ENV=production previene cambios automáticos de schema

---

## [0.5.1] — 2026-06-20 · Sprint 5 QA

### Added
- `test-report-sprint5.docx`: informe de pruebas Sprint 5 (11/11 PASS)

### Fixed
- `SessionGuard`: roles incorrectos ahora devuelven HTTP 403 (ForbiddenException) en lugar de 401 (F-F cerrado)

---

## [0.5.0] — 2026-06-20 · Sprint 5: Panel KAM

### Added
- `GET /api/kam/dashboard` — resumen ejecutivo del KAM: meta, YTD real, cumplimiento %, regla 80/20, alertas de cupo (>80% usado), facturas vencidas del portafolio
- `GET /api/kam/clients` — listado paginado de aliados con filtros `?status` y `?segment`, ordenado por YTD descendente; incluye `creditUsedPct`
- `GET /api/kam/commissions` — comisiones por año (`?year`) y mes (`?month`) con volumen total y desglose por factura; campo `onTime` para comisiones a tiempo
- Aislamiento por `vendorId`: cada KAM solo accede a sus propios aliados y comisiones

### Security
- Todas las rutas `/api/kam/*` requieren rol `KAM`; aliados y usuarios sin sesión reciben 403/401 respectivamente

---

## [0.4.1] — 2026-06-20 · Sprint 4 QA

### Added
- `test-report-sprint4.docx`: informe de pruebas Sprint 4 (14/14 PASS)

---

## [0.4.0] — 2026-06-20 · Sprint 4: Pagos PSE Wompi

### Added
- `POST /api/invoices/:id/pay` — genera URL de checkout Wompi firmada con `signature:integrity`; idempotente (reutiliza `wompiRef` si ya existe)
- `POST /api/webhooks/wompi` — recibe eventos Wompi, verifica firma `x-event-checksum` (cuando `WOMPI_EVENTS_SECRET` está configurado), marca factura como `pagada`, calcula comisión KAM 3% si el pago es a tiempo (`paidAt ≤ dueDate`), decrementa `creditUsed` en crédito 90
- `GET /api/invoices/:id` — detalle completo de una factura: `status`, `paidAt`, `commission`, `wompiRef`, `wompiTxId`
- `GET /api/payments/result` — landing de retorno tras pago en portal Wompi
- `Invoice.wompiRef` y `Invoice.wompiTxId` — nuevas columnas para rastrear transacciones Wompi
- Variables de entorno documentadas en `.env.example`: `WOMPI_PUB_KEY`, `WOMPI_PRIV_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `APP_URL`
- Webhook idempotente: `already_paid`, `ref_not_found`, `not_approved`, `ignored` como respuestas sin efecto secundario

---

## [0.3.1] — 2026-06-20 · Sprint 3 QA

### Fixed
- `OrdersController`: `GET /orders?status=invalido` devolvía 500; ahora retorna 400 con enum values válidos
- `InvoicesController`: `GET /invoices/me?status=xxx` devolvía 500; misma corrección con `@BadRequestException`
- `InvoicesService`: columna `due_date` corregida a `"dueDate"` en query builder (TypeORM mapeo camelCase)

### Added
- `test-report-sprint3.docx`: informe de pruebas Sprint 3 (13/13 PASS) con evidencias, 2 bugs encontrados y corregidos

---

## [0.3.0] — 2026-06-20 · Sprint 3: Cuenta y cartera

### Added
- `GET /api/orders` — historial de pedidos paginado del aliado con filtro opcional por status (`alistamiento`, `despacho`, `entregado`)
- `POST /api/orders/:id/repeat` — recompra en 1 clic: copia ítems y forma de pago del pedido original, verifica stock y cupo actuales, genera nuevo pedido en transacción atómica
- `GET /api/invoices/me` — facturas del aliado con filtro por status y cálculo automático de `daysOverdue`; auto-marca como `vencida` las facturas pendientes con `dueDate < hoy`
- `InvoicesModule` / `InvoicesService` / `InvoicesController` — módulo independiente

---

## [0.2.1] — 2026-06-20 · Sprint 2 QA

### Added
- `test-report-sprint2.docx`: informe de pruebas Sprint 2 (18/18 PASS) con evidencias, hallazgos y próximos pasos

### Known Issues
- F-01: `POST /orders/preview` acepta `items: []` y devuelve total $0 sin error de validación — fix aplazado a Sprint 3 (`@ArrayMinSize(1)` en `CreateOrderDto`)

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
