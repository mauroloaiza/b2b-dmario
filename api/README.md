# D'MARIO B2B — API Backend

Portal Mayorista B2B para D'MARIO · Colombia · Fase 1 MVP

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 + TypeScript |
| Base de datos | PostgreSQL 16 (Docker) |
| ORM | TypeORM 1.0 |
| Auth | Better Auth |
| Validación | class-validator + class-transformer |

## Requisitos

- Node.js 20+
- Docker + Docker Compose (en WSL o nativo)

## Arrancar en local

### 1. Variables de entorno

```bash
cp .env.example .env
```

### 2. Levantar PostgreSQL

```bash
# Desde WSL
docker compose up -d
```

> PostgreSQL corre en el puerto **5435** del host (5432 interno) para evitar conflictos.

### 3. Migrar tablas de Better Auth (solo la primera vez)

```bash
npx @better-auth/cli migrate --config src/auth/auth.instance.ts
```

### 4. Seed inicial

```bash
npm run seed
```

Crea 4 vendedores, 9 clientes, 12 productos y 9 usuarios de prueba.

### 5. Levantar la API

```bash
npm run start:dev
```

API disponible en `http://localhost:3000/api`

---

## Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Aliado | esmeralda@aliado.com | aliado123 |
| Aliado | eltiempo@aliado.com | aliado123 |
| KAM | andres.m@dmario.com | kam123 |
| KAM | laura.p@dmario.com | kam123 |

---

## Auth — Better Auth

Better Auth maneja sesiones por cookie. Sus rutas se exponen bajo `/api/auth/`:

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/sign-in/email` | Login |
| POST | `/api/auth/sign-up/email` | Registro |
| POST | `/api/auth/sign-out` | Cerrar sesión |
| GET | `/api/auth/get-session` | Sesión actual |

```bash
# Ejemplo de login
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"esmeralda@aliado.com","password":"aliado123"}'
```

Para proteger rutas propias usar `SessionGuard` y opcionalmente `@Roles(UserRole.KAM)`.

> **Nota CSRF:** `sign-out` y `sign-up` requieren el header `Origin` (p.ej. `http://localhost:5173`).
> El navegador lo envía automáticamente; en Postman/Bruno o curl hay que agregarlo a mano:
> ```bash
> curl -X POST http://localhost:3000/api/auth/sign-out \
>   -H "Content-Type: application/json" \
>   -H "Origin: http://localhost:5173" \
>   -b "better-auth.session_token=<token>" \
>   -d '{}'
> ```

---

## Estructura

```
src/
├── auth/
│   ├── auth.instance.ts     ← Better Auth (pg pool + campos custom)
│   ├── auth.controller.ts   ← proxy a Better Auth handler
│   ├── auth.module.ts
│   ├── session.guard.ts     ← guard que valida sesión Better Auth
│   └── roles.decorator.ts   ← @Roles(UserRole.KAM)
├── catalog/product.entity   ← ref, línea, precio, pack, stock
├── clients/client.entity    ← aliados: cupo, segmento A/B/C, KAM
├── vendors/vendor.entity    ← KAMs: meta, zona
├── orders/
│   ├── order.entity         ← pedido: forma de pago, totales, estado
│   ├── order-item.entity    ← ítem con precio congelado
│   └── invoice.entity       ← factura: vencimiento, comisión KAM
├── common/enums.ts          ← UserRole, PaymentTerm, OrderStatus, etc.
└── seed/seed.ts             ← datos del handoff data.jsx
```

---

## Reglas de negocio

| Regla | Fórmula |
|---|---|
| Descuento contado | `subtotal × 0.08` |
| Descuento pronto pago 30d | `subtotal × 0.05` |
| Crédito 90d | sin descuento |
| Validación de cupo | solo para crédito 90d: `total ≤ creditLimit - creditUsed` |
| Comisión KAM | `invoice.amount × 0.03` solo si `paidAt ≤ dueDate` |
| PVP sugerido | `Math.round(priceMayo × 1.35 / 100) × 100` |

> **Todas las reglas de negocio viven en el backend.** El frontend solo muestra.

---

## Roadmap de sprints

| Sprint | Estado | Descripción |
|---|---|---|
| 1 — Cimientos | ✅ | Docker, DB, entidades, Better Auth, seed |
| 2 — Comprar | ✅ | Catálogo, `/me`, `/orders/preview`, `/orders` con reglas de negocio |
| 3 — Cuenta y cartera | ✅ | Historial, recompra en 1 clic, facturas con días de mora |
| 4 — Pagos PSE | ✅ | Wompi checkout, webhooks, comisión KAM al recaudo |
| 5 — Panel KAM | ⏳ | Alertas, segmentación 80/20, metas |
| 6 — Datos reales + QA | ⏳ | 470 clientes, catálogo real, producción |

---

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `DB_HOST` | localhost | Host PostgreSQL |
| `DB_PORT` | 5435 | Puerto PostgreSQL (host) |
| `DB_NAME` | dmario_b2b | Nombre de la DB |
| `DB_USER` | dmario | Usuario |
| `DB_PASS` | dmario_dev_2026 | Contraseña |
| `PORT` | 3000 | Puerto de la API |
| `NODE_ENV` | development | Entorno |

> Producción: agregar `BETTER_AUTH_SECRET` (≥32 chars) y `BETTER_AUTH_URL`.
