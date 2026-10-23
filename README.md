<div align="center">

# ☕ Cheo Manager

**ERP de gestión para Cheo: facturación, inventario, producción, cartera y control de utilidades.**

[![CI](https://github.com/SantiagoHerrera01/CheosManagment/actions/workflows/ci.yml/badge.svg)](https://github.com/SantiagoHerrera01/CheosManagment/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-22%20LTS-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-17-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-orange)

</div>

---

## 📌 Estado del proyecto

> **En desarrollo activo (Fase 1–2).** El backend ya tiene **autenticación con roles** y el
> **módulo de facturación** (clientes, productos/precios, facturas, cartera/abonos e
> inventario). El frontend todavía corre sobre datos de demostración: conectarlo es la
> siguiente etapa.
>
> Detalle técnico de lo que existe y lo que falta: **[docs/REVISION-2026-10-22.md](docs/REVISION-2026-10-22.md)**

---

## 🎯 ¿Qué resuelve?

Hoy la facturación se hace **manual con talonario**. Cheo Manager busca ser un sistema **autónomo y de pocos clicks**, usable en campo:

| # | Módulo | Descripción |
|---|--------|-------------|
| **R1** | **Facturación** | Clientes registrados una sola vez; al facturar basta con la **cédula**. Precios parametrizados y totales automáticos. |
| **R2** | **Cartera** | Cartera por cliente, **abonos parciales** y pagos completos. |
| **R3** | **Inventario** | Stock por presentación/gramaje; descuento automático al facturar, ingreso por producción/compras. |
| **R4** | **Producción** | Pergamino → **trilla → tueste → empacado** con mermas por etapa. |
| **R5** | **Insumos** | Bolsas, adhesivos y material de empaque en bodega. |
| **R6** | **Gastos** | Carga de gastos operativos. |
| **R7** | **Costos y utilidad** | Costeo interno y utilidad mensual: facturado − costo − gastos. |
| **R8** | **Alertas** | Facturas por vencer/vencidas (**30 días**), stock mínimo, reportes. |
| **R9** | **WhatsApp** | Compartir la factura directo al cliente. |
| **R10** | **UX** | Interfaz simple, pocos pasos y **pensada para el celular**. |

> 📄 Fuente: 11 audios del cliente → **[docs/REVISION-2026-10-22.md](docs/REVISION-2026-10-22.md)**

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | **React 19** + **TypeScript** + **Vite 8** + **Tailwind 4** + **react-router-dom 7** |
| Backend | **Node.js 22 LTS** + **Express 5** + **TypeScript (ESM)** |
| Base de datos | **PostgreSQL 17** con **Prisma ORM 6** |
| Monorepo | **npm workspaces** + **Turborepo** (builds cacheados y en paralelo) |
| Infraestructura | **Docker** + **Docker Compose** (BD y API en contenedores) |
| API | **OpenAPI 3.0** + **Swagger UI** en `/api/docs` |
| Calidad | **ESLint** + **TypeScript** + **GitHub Actions (CI)** |

---

## 📁 Estructura del repositorio

```
CheosManagment/
├── .github/
│   └── workflows/ci.yml         # CI: prisma validate + typecheck + build
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Migraciones aplicadas
│   │   ├── schema.prisma        # Modelo de datos
│   │   └── seed.ts              # Usuarios iniciales + catálogo base
│   ├── scripts/
│   │   └── import-clients.ts    # Importa clientes desde JSON
│   ├── src/
│   │   ├── config/env.ts        # Variables de entorno validadas
│   │   ├── docs/swagger.ts      # Especificación OpenAPI
│   │   ├── modules/             # auth, users, clients, products, invoices, inventory
│   │   ├── shared/              # middlewares, utilidades y cliente Prisma
│   │   ├── types/               # Augmentación de tipos de Express
│   │   ├── app.ts               # Express app + rutas documentadas (@openapi)
│   │   └── server.ts            # Punto de entrada
│   ├── Dockerfile               # Targets: dev (hot reload) y prod
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  pages/  router/  layouts/
│   │   ├── hooks/  data/  types/  assets/
│   ├── .env.example
│   └── package.json
├── compose.yaml                 # Servicios: db (PostgreSQL 17) + backend
├── turbo.json                   # Tareas del monorepo (build, dev, lint…)
├── .dockerignore
├── .editorconfig
├── .gitattributes
├── .gitignore
├── package.json                 # Workspaces + scripts raíz
└── package-lock.json            # Único lockfile del proyecto
```

---

## 🚀 Inicio rápido

### Prerrequisitos

| Tool | Versión |
|------|---------|
| Node.js | 22 LTS o superior |
| Docker Desktop | con Docker Compose v2 |

### 3 comandos y queda corriendo

```bash
npm install                  # 1. dependencias de todo el monorepo
docker compose up -d --build # 2. PostgreSQL 17 + API con hot reload
npm run dev:frontend         # 3. Vite → http://localhost:5173
```

| Verificar | URL |
|-----------|-----|
| API | <http://localhost:3000/api> |
| **Swagger UI** | <http://localhost:3000/api/docs> |
| Frontend | <http://localhost:5173> |

> 📖 Comandos completos, migraciones, problemas comunes y modo producción →
> [🐳 Levantar el proyecto con Docker](#-levantar-el-proyecto-con-docker)

---

## 🐳 Levantar el proyecto con Docker

Docker levanta **la base de datos y el backend**. El frontend corre en local
(Vite sobre bind mounts en Windows se siente lento, por eso queda fuera).

| Servicio | Contenedor | Puerto | Qué hace |
|----------|-----------|--------|----------|
| `db` | ✅ `cheo-db` | `5432` | PostgreSQL 17 con volumen persistente (`pgdata`) |
| `backend` | ✅ `cheo-api` | `3000` | API Express con **hot reload** (`tsx watch`) |
| `frontend` | ❌ local | `5173` | Vite corriendo en tu máquina con `npm run dev:frontend` |

### Primer arranque (paso a paso)

```bash
# 1. Clonar e instalar las dependencias del monorepo
git clone https://github.com/SantiagoHerrera01/CheosManagment.git
cd CheosManagment
npm install

# 2. Levantar PostgreSQL + API (la primera vez descarga las imágenes: ~1 min)
docker compose up -d --build

# 3. Confirmar que ambos servicios estén arriba
docker compose ps
#   cheo-db    → (healthy)
#   cheo-api   → Up

# 4. Levantar el frontend en local
npm run dev:frontend          # → http://localhost:5173
```

**Verificar que todo funciona:**

```bash
curl http://localhost:3000/api              # {"name":"Cheo Manager API",...}
open http://localhost:3000/api/docs         # Swagger UI
```

> 💡 No necesitas crear el `.env` para usar Docker: `compose.yaml` define su propio
> `DATABASE_URL` apuntando al servicio `db`. El `.env` solo se usa si corres el
> backend en local (Opción B).

### Comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `npm run docker:up` | `docker compose up -d` → levanta `db` + `backend` en segundo plano |
| `docker compose up -d --build` | Igual, **reconstruyendo** la imagen del backend (útil tras cambiar dependencias o el Dockerfile) |
| `npm run docker:logs` | Sigue en vivo los logs del backend |
| `docker compose logs -f db` | Sigue los logs de PostgreSQL |
| `docker compose ps` | Estado y puertos de los servicios |
| `docker compose restart backend` | Reinicia solo la API |
| `docker compose restart db` | Reinicia solo la base de datos |
| `docker compose down` | Detiene todo. **Los datos persisten** |
| `docker compose down -v` | Detiene y **borra** los volúmenes (⚠️ borra la BD) |
| `docker compose exec db psql -U cheo -d cheo_manager` | Consola `psql` dentro de la BD |
| `docker compose exec backend npm run db:migrate -w backend` | Aplica migraciones de Prisma |
| `docker compose exec backend npm run db:studio -w backend` | Prisma Studio en `http://localhost:5555` |
| `docker compose exec backend bash` | Shell dentro del contenedor del backend |
| `npm run build -- --force` | Reconstruye apps ignorando la caché de Turborepo |

### Frontend en local (mientras Docker corre el backend)

```bash
npm run dev:frontend     # Vite → http://localhost:5173
```

El frontend usa `frontend/.env` (`VITE_API_URL=http://localhost:3000/api`).

### Opción B — Sin Docker para la API

```bash
npm install
cp backend/.env.example backend/.env     # ajustar credenciales de Postgres
npm run dev:backend                      # API en http://localhost:3000/api
```

Si solo quieres la BD en contenedor: `docker compose up -d db`.

### Problemas comunes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `ECONNREFUSED` al consultar la BD | El backend corre en local pero la BD no | `docker compose up -d db` |
| Puerto `3000` o `5432` ocupado | Otro proceso usando el puerto | Cambia `PORT` en `compose.yaml` o para el proceso |
| La API no detecta cambios | `tsx watch` se frenó tras un error | `docker compose restart backend` |
| Error tras instalar dependencias nuevas | El `node_modules` del contenedor está desactualizado | `docker compose exec backend npm install` y luego `docker compose restart backend` |
| Quieres empezar de cero | Volumen sucio | `docker compose down -v` ⚠️ **borra los datos** |

### Imagen de producción

```bash
# Compilar la imagen optimizada (multi-stage, sin dependencias de desarrollo)
docker build -f backend/Dockerfile --target prod -t cheo-api .

# Ejecutarla apuntando a una base de datos externa
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://usuario:clave@host:5432/cheo_manager" \
  cheo-api
```

---

## 📖 Documentación de la API (Swagger)

| Recurso | URL |
|---------|-----|
| **Swagger UI** (interactiva, con botón *Try it out*) | http://localhost:3000/api/docs |
| Especificación OpenAPI 3.0 en JSON | http://localhost:3000/api/openapi.json |

- Cada endpoint se documenta con anotaciones `@openapi` encima de la ruta en
  [`backend/src/app.ts`](backend/src/app.ts) y en los routers de `backend/src/modules/`.
- El JSON se puede importar directo en **Postman** o **Insomnia** (habilita *Cookies*:
  la sesión viaja en cookies `HttpOnly`, no en el body).
- Las etiquetas (`tags`) de los módulos están declaradas en
  [`backend/src/docs/swagger.ts`](backend/src/docs/swagger.ts).

---

## 🔑 Autenticación y roles

El backend exige sesión en todos los módulos de negocio. La sesión se maneja con
**cookies `HttpOnly` + `SameSite=Strict`** (access token de 15 min y refresh token
rotativo de 7 días), de forma que **nada es accesible desde JavaScript** y se mitiga CSRF.

### Roles

| Rol | Puede |
|-----|-------|
| **ADMIN** | Todo: usuarios, catálogo, costos, anular facturas pagadas |
| **VENDEDOR** | Facturar, gestionar clientes, registrar abonos, anular facturas pendientes |
| **BODEGA** | Entradas de stock, movimientos de inventario |
| **CONTADOR** | Solo lectura de facturas, clientes y reportes (ve costos) |

> El costo interno de producción (`cost`) **nunca** se envía a VENDEDOR ni a BODEGA.

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Inicia sesión (emite las cookies) |
| `POST` | `/api/auth/refresh` | Rota el refresh token y renueva la sesión |
| `POST` | `/api/auth/logout` | Cierra la sesión |
| `GET` | `/api/auth/me` | Usuario autenticado |
| `POST` | `/api/auth/change-password` | Cambia la contraseña propia |
| `GET/POST/PATCH` | `/api/users` | Gestión de usuarios (solo ADMIN) |
| `GET/POST/PATCH` | `/api/clients` | Clientes con saldo de cartera |
| `GET/POST/PATCH` | `/api/products` | Catálogo, presentaciones y precios |
| `GET/POST` | `/api/invoices` | Crear y consultar facturas |
| `POST` | `/api/invoices/:id/payments` | Registrar abonos (cartera) |
| `POST` | `/api/invoices/:id/void` | Anular factura (devuelve stock) |
| `GET` | `/api/invoices/overdue` | Facturas vencidas/por vencer (alertas) |
| `GET` | `/api/inventory/movements` | Historial de movimientos de stock |

### Usuarios de desarrollo (seed)

```bash
npm run db:seed -w backend   # crea usuarios, cliente "Consumidor Final" y catálogo base
```

| Rol | Correo | Contraseña |
|-----|--------|------------|
| ADMIN | `admin@cheo.com` | `CheoAdmin2026!` |
| VENDEDOR | `vendedor@cheo.com` | `CheoVende2026!` |

> ⚠️ Son credenciales **de desarrollo**. En producción se crean usuarios reales desde
> el panel de administración y se cambian estas contraseñas.

### Seguridad implementada

- Contraseñas con **Argon2id** (64 MB, 3 iteraciones — recomendación OWASP).
- Bloqueo de cuenta tras **5 intentos fallidos** (15 min) + límite de peticiones por IP.
- Refresh tokens guardados **hasheados** en BD, con **rotación** y detección de reutilización.
- Cabeceras de seguridad con **Helmet**, CORS restringido a los orígenes configurados
  y verificación de `Origin` en peticiones que modifican datos.
- Validación de entrada con **Zod** en todos los endpoints.
- Precios y stock se calculan **siempre en el servidor** (nunca se confía en el cliente).

### Importar clientes desde un Excel

Si el cliente tiene una base existente en Excel, se convierte a JSON y se importa:

```bash
npm run import:clients -w backend -- ./clientes.json
```

El importador es **idempotente** (hace *upsert* por cédula/NIT) y reporta los
registros inválidos sin abortar el resto.

---

## 📜 Scripts del monorepo

| Script | Descripción |
|--------|-------------|
| `npm run setup` | Instala dependencias de todos los workspaces |
| `npm run dev` | Backend + frontend en paralelo (Turborepo) |
| `npm run dev:backend` / `dev:frontend` | Solo uno de los dos |
| `npm run build` | Compila ambos workspaces (cacheado con Turbo) |
| `npm run typecheck` | Verifica tipos sin generar salida |
| `npm run lint` | ESLint (frontend) |
| `npm run db:migrate` | Migraciones de Prisma |
| `npm run db:generate` | Regenera el cliente Prisma |
| `npm run db:validate` | Valida `schema.prisma` |
| `npm run db:seed` | Crea usuarios iniciales, cliente por defecto y catálogo base |
| `npm run import:clients` | Importa clientes desde un JSON (`-- ./clientes.json`) |
| `npm run db:studio` | Prisma Studio (inspector visual de la BD) |
| `npm run docker:up` | `docker compose up -d` → BD + API (ver [🐳 Docker](#-levantar-el-proyecto-con-docker)) |
| `npm run docker:down` | Detiene los contenedores (los datos persisten) |
| `npm run docker:logs` | Sigue los logs del backend en vivo |

---

## ⚙️ Variables de entorno

**`backend/.env`** (la usa el backend en local):

```env
PORT=3000
DATABASE_URL="postgresql://cheo:cheo_dev_password@localhost:5432/cheo_manager?schema=public"

# Seguridad — obligatorios en producción (mínimo 32 caracteres).
# En desarrollo se generan valores locales de respaldo con advertencia.
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

CORS_ORIGINS=http://localhost:5173
```

Genera los secretos con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**`frontend/.env`**:

```env
VITE_API_URL=http://localhost:3000/api
```

> 🔒 En Docker, `compose.yaml` define su propio `DATABASE_URL` apuntando al servicio `db` y **no** usa el `.env` (dotenv no sobreescribe variables ya definidas).

---

## 🗺️ Roadmap

| Fase | Objetivo | Estado |
|------|----------|--------|
| **0** | Repo profesional: README, gitignore, CI | ✅ |
| **0.5** | Monorepo (workspaces + Turbo), Docker (BD + API) y Swagger en `/api/docs` | ✅ |
| **1** | Modelo de datos completo + migraciones + seed | ✅ |
| **1.5** | Autenticación (login, cookies, refresh rotativo) + usuarios y roles | ✅ |
| **2** | API: clientes, productos/precios, facturas, cartera/abonos, inventario | ✅ |
| **3** | Conectar el frontend y arreglar el flujo de ventas | ⏳ Siguiente |
| **4** | Módulos nuevos: Producción, Insumos, Gastos, Utilidad, Alertas, WhatsApp | ⬜ |
| **5** | Calidad: `strict`, lint limpio, loading/errores, móvil, tests | ⬜ |

---

## 🧰 Calidad de código

- **Monorepo:** `npm run build` / `typecheck` / `lint` corren en todos los workspaces con caché de Turborepo.
- **Lint:** actualmente reporta **11 errores conocidos** (se corrigen en la Fase 5).
- **CI:** cada *push* y PR a `main` ejecuta `prisma validate` + typecheck + build en [GitHub Actions](.github/workflows/ci.yml). El lint corre **informativo** hasta cerrar la deuda técnica.
- **Formato:** [`.editorconfig`](.editorconfig) + [`.gitattributes`](.gitattributes) → UTF-8, LF, sangría de 2 espacios.

---

## 📄 Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/REVISION-2026-10-22.md](docs/REVISION-2026-10-22.md) | Revisión técnica, requisitos del cliente (R1–R10), bugs pendientes y plan de ataque |

---

## 🤝 Contribuir

1. Crea una rama: `git checkout -b feature/nombre-cambio`
2. Cambios pequeños y enfocados, con build y lint en verde
3. Abre un *Pull Request* explicando **qué cambia** y **por qué**

---

## 🔒 Seguridad

Los archivos `.env` (credenciales, base de datos) **nunca** se versionan: solo se suben los `.env.example`, y `.dockerignore` impide que entren en las imágenes.

---

## 📝 Licencia

**Todos los derechos reservados.** © 2026 Santiago Castañeda.
Proyecto privado desarrollado para Cheo; sin licencia pública de uso, copia o distribución.
