# ── Etapa 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Eliminar devDependencies antes de copiar a producción
RUN npm prune --production

# ── Etapa 2: producción ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Usuario no-root para reducir superficie de ataque
RUN addgroup -S dmario && adduser -S dmario -G dmario

COPY --from=builder --chown=dmario:dmario /app/node_modules ./node_modules
COPY --from=builder --chown=dmario:dmario /app/dist         ./dist
COPY --from=builder --chown=dmario:dmario /app/package.json ./package.json

USER dmario

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main"]
