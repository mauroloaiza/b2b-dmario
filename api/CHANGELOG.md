# Changelog — D'MARIO B2B API

Formato: [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)

---

## [Unreleased]

---

## [0.8.0] — 2026-06-20 · Sprint 8: Mi cuenta

### Added
- `GET /orders/recompra` — sugiere top 8 productos frecuentes del aliado; calcula ciclo promedio
  de recompra (días entre pedidos consecutivos por producto), días desde el último pedido y flag
  `tocaPedir` cuando ≥85% del ciclo ha transcurrido; resultado ordenado por urgencia descendente

### Frontend
- `Account.tsx` rediseño completo alineado al handoff de diseño:
  - KPI cards: Compras YTD (sparkline decorativo), Cupo disponible con barra de uso,
    Saldo en cartera con contador de facturas, Puntos lealtad derivados del YTD
  - Sección "Recompra inteligente": cards con imagen/ref, ciclo promedio, días transcurridos,
    alerta naranja "toca pedir", botón "+ Agregar" con feedback visual ✓
  - Historial de pedidos: últimos 5 con estado en pill de color, acciones Repetir y Factura
  - Facturas pendientes inline con total acumulado y enlace Pagar PSE
  - Tarjeta del vendedor asignado con botón directo a WhatsApp
  - Botones "Descargar estado" y "WhatsApp con {vendedor}" en el header del cliente

---

## [0.7.0] — 2026-06-20 · Sprint 7: Notificaciones + Pantallas

### Added

**Notificaciones (Nodemailer):**
- `NotificationsModule` / `NotificationsService` — Nodemailer con fallback automático a
  cuenta Ethereal cuando `SMTP_HOST` está vacío (preview URL en consola en dev)
- `sendOrderConfirmed()` — email HTML al aliado con tabla de ítems, descuento, total
  y fecha de vencimiento; disparado fire-and-forget tras confirmar pedido
- `sendStatusUpdate()` — notificación de cambio de estado (alistando/en_ruta/entregado);
  disparado fire-and-forget al actualizar estado desde admin
- `Client.email` — columna nullable añadida para routing de notificaciones;
  5 clientes del seed actualizados con email real de prueba
- Variables `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`

**Backend analytics:**
- `GET /admin/intelligence` — análisis Pareto 80/20: top 15 clientes por YTD,
  porcentaje de revenue que concentran, ventas por ciudad (top 8), segmentación A/B/C
  con conteo y revenue, scoreboard de vendedores con % cumplimiento de meta
- `GET /admin/treasury` — envejecimiento de CxC en 5 buckets (Corriente / 1-30 / 31-60 /
  61-90 / +90 días), DSO ponderado por bucket, top 8 deudores, total CxC vs. cartera vencida
- `Invoice` incorporado a `AdminModule` para extensión futura

**Frontend (6 pantallas nuevas):**
- `07 Confirmation.tsx` — tracker visual 4 etapas (Confirmado › Alistando › En ruta › Entregado)
  con líneas de progreso, grilla de datos (código, unidades, total, vencimiento)
- `05 admin/Intelligence.tsx` — KPIs, barra Pareto animada, top clientes en tabla, barras
  de ventas por ciudad, segmentación en cards A/B/C, scoreboard de vendedores
- `08 admin/Coordination.tsx` — cobertura por vendedor, asignación inline con selector,
  filtros "Sin asignar" y "En riesgo", guardar con PATCH /admin/clients/:id
- `09 admin/Treasury.tsx` — aging en 5 cards de color, barra corriente/vencida, top
  deudores en tabla con antigüedad resaltada por semáforo, DSO en KPI
- `10 admin/Logistics.tsx` — pipeline Kanban con tabs por etapa, cards de pedido con
  ítems resumidos, botón "→ Avanzar etapa" con actualización en tiempo real
- `KAM Route.tsx` — lista de cartera con días desde último pedido, alertas "por visitar"
  (>30d) y "en riesgo", **modo proxy**: toma pedido en nombre del cliente con catálogo
  rápido y banner naranja de contexto
- Sidebar admin actualizado: Inteligencia, Coordinación, Cartera, Logística
- Topbar KAM: enlace "Mi ruta"
- `adminApi.intelligence()` y `adminApi.treasury()` en `client.ts`
- Tipos `IntelligenceData` y `TreasuryData` exportados desde `client.ts`

### Security
- `SMTP_HOST` vacío activa modo Ethereal en lugar de fallar; sin credenciales reales
  en dev, sin envíos no deseados

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
