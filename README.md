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

> **En desarrollo activo (Fase 0–1).** El frontend tiene la interfaz de los módulos principales sobre datos de demostración; el backend es un esqueleto con un único endpoint. La integración completa es la siguiente gran etapa.
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
| Calidad | **ESLint** + **TypeScript** + **GitHub Actions (CI)** |

---

## 📁 Estructura del repositorio

```
CheosManagment/
├── .github/
│   └── workflows/ci.yml         # CI: prisma validate + typecheck + build
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Modelo de datos
│   ├── src/
│   │   ├── app.ts               # Express app
│   │   ├── server.ts            # Punto de entrada
│   │   └── shared/database/     # Cliente Prisma
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

### Opción A — Con Docker (recomendada)

La **base de datos y el backend** corren en contenedores; el frontend en local (más rápido en Windows):

```bash
git clone https://github.com/SantiagoHerrera01/CheosManagment.git
cd CheosManagment

npm install            # dependencias de todo el monorepo

docker compose up -d   # PostgreSQL 17 + API (hot reload)

npm run dev:frontend   # Vite en http://localhost:5173
```

### Opción B — Todo en local

```bash
npm install
cp backend/.env.example backend/.env     # ajustar credenciales
npm run dev:backend                      # API en http://localhost:3000/api
npm run dev:frontend                     # Vite en http://localhost:5173
```

> 💡 La API necesita la BD corriendo: `docker compose up -d db` es suficiente si prefieres el backend en local.

---

## 🐳 Comandos de Docker

| Comando | Qué hace |
|---------|----------|
| `npm run docker:up` | Levanta `db` + `backend` en segundo plano |
| `npm run docker:logs` | Sigue los logs del backend |
| `docker compose ps` | Estado de los servicios |
| `docker compose down` | Detiene todo (**los datos persisten**) |
| `docker compose down -v` | Detiene y **borra** la base de datos |
| `docker compose exec backend npm run db:migrate -w backend` | Aplica migraciones dentro del contenedor |
| `docker compose restart backend` | Reinicia la API |

**Imagen de producción:**

```bash
docker build -f backend/Dockerfile --target prod -t cheo-api .
docker run -p 3000:3000 -e DATABASE_URL="postgresql://..." cheo-api
```

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
| `npm run db:studio` | Prisma Studio (inspector visual de la BD) |

---

## ⚙️ Variables de entorno

**`backend/.env`** (la usa el backend en local):

```env
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/cheo_manager?schema=public"
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
| **0.5** | Monorepo (workspaces + Turbo) y Docker (BD + API) | ✅ |
| **1** | Modelo de datos completo + migración + seed | ⏳ Siguiente |
| **2** | API: clientes, productos/precios, facturas, cartera/abonos | ⬜ |
| **3** | Conectar el frontend y arreglar el flujo de ventas | ⬜ |
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
