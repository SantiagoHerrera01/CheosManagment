# syntax=docker/dockerfile:1
# ============================================================
#  Cheo Manager — API (backend)
#
#  Targets:
#    dev  → desarrollo con hot reload (lo usa compose.yaml)
#    prod → imagen optimizada y lista para producción
#
#  Build (desde la raíz del monorepo):
#    docker build -f backend/Dockerfile --target prod -t cheo-api .
# ============================================================

# ---------- Base común ----------
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=development

# Solo los manifiestos: así la capa de dependencias se cachea
# mientras no cambien package.json / package-lock.json
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# ---------- Dependencias del backend ----------
FROM base AS deps
RUN npm ci -w backend

# ---------- Build (tsc + cliente Prisma) ----------
FROM deps AS build
COPY backend/ backend/
RUN npm run db:generate -w backend && \
    npm run build -w backend

# ---------- DEV: hot reload con tsx watch ----------
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "-w", "backend"]

# ---------- PROD: imagen mínima y optimizada ----------
FROM node:22-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci -w backend --omit=dev

# Código compilado + cliente de Prisma generado
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY backend/prisma backend/prisma

EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
