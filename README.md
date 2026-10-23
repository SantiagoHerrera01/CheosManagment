<div align="center">

# ☕ Cheo Manager

**ERP de gestión para Cheo: facturación, inventario, producción, cartera y control de utilidades.**

[![CI](https://github.com/SantiagoHerrera01/CheosManagment/actions/workflows/ci.yml/badge.svg)](https://github.com/SantiagoHerrera01/CheosManagment/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-22%20LTS-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-4169E1?logo=postgresql&logoColor=white)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-orange)

</div>

---

## 📌 Estado del proyecto

> **En desarrollo activo (Fase 0–1).** El frontend cuenta con la interfaz de los módulos principales sobre datos de demostración; el backend es un esqueleto con un único endpoint. La integración completa es la siguiente gran etapa.
>
> Detalle técnico completo de lo que existe y lo que falta: **[docs/REVISION-2026-10-22.md](docs/REVISION-2026-10-22.md)**

---

## 🎯 ¿Qué resuelve?

Hoy la facturación se hace **manual con talonario**: hay que cargar el talonario, el lapicero y volver a registrar cada cliente en cada venta. Cheo Manager busca ser un sistema **autónomo y de pocos clicks**, usable en campo, que cubra:

| # | Módulo | Descripción |
|---|--------|-------------|
| **R1** | **Facturación** | Base de datos de clientes registrada una sola vez; al facturar basta con escribir la **cédula**. Precios parametrizados por producto/presentación y totales automáticos. |
| **R2** | **Cartera** | Consulta de cartera por cliente, registro de **abonos parciales** y pagos completos. |
| **R3** | **Inventario (producto terminado)** | Stock por producto, presentación y gramaje; descuento automático al facturar, ingreso por producción/compras (los obsequios también descuentan). |
| **R4** | **Producción** | Materia prima (café en pergamino) → **trilla → tueste → empacado**, registrando mermas/rendimiento por etapa y generando producto terminado. |
| **R5** | **Insumos y empaque** | Control de bolsas, adhesivos, posillos y material publicitario en bodega. |
| **R6** | **Gastos** | Carga de gastos operativos de la empresa (bolsas, domicilios, insumos, etc.). |
| **R7** | **Costos y utilidad** | Costeo interno por producto (materia prima + empaque + proceso) y cálculo de **utilidad mensual**: facturado − costo − gastos. |
| **R8** | **Alertas y reportes** | Recordatorios de facturas por vencer/vencidas (**30 días**), alertas de stock mínimo, reporte de cartera y de inventario. |
| **R9** | **Envío por WhatsApp** | Compartir la factura generada directo al WhatsApp del cliente. |
| **R10** | **UX autónoma** | Interfaz simple, pocos pasos, pensada para usarse en el momento y desde el **celular**. |

> 📄 Fuente: 11 audios del cliente transcritos el 2026-10-22 → ver [docs/REVISION-2026-10-22.md](docs/REVISION-2026-10-22.md).

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | **React 19** + **TypeScript** + **Vite 8** + **Tailwind CSS 4** + **react-router-dom 7** + **lucide-react** |
| Backend | **Node.js 22 LTS** + **Express 5** + **TypeScript (ESM)** |
| Base de datos | **PostgreSQL** con **Prisma ORM 6** |
| Calidad | **ESLint** + **TypeScript** + **GitHub Actions (CI)** |
| Herramientas | `tsx` (dev), `tsc` (build), Prisma Migrate |

---

## 📁 Estructura del repositorio

```
CheosManagment/
├── .github/
│   └── workflows/ci.yml         # Pipeline: typecheck + build (lint informativo)
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Modelo de datos (Prisma + PostgreSQL)
│   ├── src/
│   │   ├── app.ts               # Express app + rutas
│   │   ├── server.ts            # Punto de entrada
│   │   └── shared/database/     # Cliente Prisma
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # UI reutilizable (módulo de ventas, sidebar…)
│   │   ├── pages/               # Dashboard, Ventas, Clientes, Inventario…
│   │   ├── router/              # Definición de rutas
│   │   ├── layouts/             # MainLayout (sidebar + header)
│   │   ├── hooks/  data/  types/
│   │   └── assets/
│   ├── .env.example
│   └── vite.config.ts
├── database/                    # SQL, seeds y diagramas (pendiente)
├── docs/                        # Documentación del proyecto
│   └── REVISION-2026-10-22.md   # Revisión técnica + requisitos del cliente
├── assets/                      # Recursos compartidos (logos, imágenes)
├── .editorconfig
├── .gitattributes
├── .gitignore
├── package.json                 # Scripts raíz (dev, build, db:*)
└── README.md
```

---

## 🚀 Inicio rápido

### Prerrequisitos

| Tool | Versión |
|------|---------|
| Node.js | 22 LTS o superior |
| npm | 10+ |
| PostgreSQL | 14+ |

### 1. Clonar el repositorio

```bash
git clone https://github.com/SantiagoHerrera01/CheosManagment.git
cd CheosManagment
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
# Editar .env con tus credenciales de PostgreSQL
npm run db:migrate          # ⏳ Pendiente: aún no existe la primera migración (Fase 1)
npm run dev                 # http://localhost:3000/api
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev                 # http://localhost:5173
```

> 💡 Desde la raíz también puedes usar `npm run dev:backend` y `npm run dev:frontend` (dos terminales).

---

## 📜 Scripts disponibles

### Raíz

| Script | Descripción |
|--------|-------------|
| `npm run dev:backend` | Levanta la API en modo desarrollo |
| `npm run dev:frontend` | Levanta Vite en modo desarrollo |
| `npm run build` | Compila backend (tsc) y frontend (tsc -b + vite build) |
| `npm run lint` | ESLint sobre el frontend |
| `npm run db:migrate` | Crea/aplica migraciones de Prisma |
| `npm run db:generate` | Regenera el cliente de Prisma |
| `npm run db:studio` | Abre Prisma Studio (inspector de BD) |
| `npm run setup` | Instala dependencias de backend y frontend |

### `backend/`

| Script | Descripción |
|--------|-------------|
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta `dist/server.js` |

### `frontend/`

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | ESLint |
| `npm run preview` | Previsualiza el build |

---

## ⚙️ Variables de entorno

**`backend/.env`**

```env
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/cheo_manager?schema=public"
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:3000/api
```

> 🔒 Los archivos `.env` **nunca** se suben al repo (están en `.gitignore`). Solo se versionan los `.env.example`.

---

## 🗺️ Roadmap

| Fase | Objetivo | Estado |
|------|----------|--------|
| **0** | Cimientos: git, README, documentación, CI | ✅ Completada |
| **1** | Modelo de datos completo en Prisma + migración + seed | ⏳ Siguiente |
| **2** | API: clientes, productos/precios, facturas (descuento de stock), cartera/abonos | ⬜ Pendiente |
| **3** | Conectar el frontend (capa de servicios, proxy, eliminar mocks) y arreglar el flujo de ventas | ⬜ Pendiente |
| **4** | Módulos nuevos: Producción con mermas, Insumos, Gastos, Costos/Utilidad, Alertas, WhatsApp | ⬜ Pendiente |
| **5** | Calidad: `strict`, lint limpio, loading/errores, responsive móvil, tests | ⬜ Pendiente |

Detalle de tareas y bugs pendientes: **[docs/REVISION-2026-10-22.md](docs/REVISION-2026-10-22.md)**

---

## 🧰 Calidad de código

- **Typecheck:** `npm run build` (frontend pasa `tsc -b`; backend pasa `tsc --strict`).
- **Lint:** `npm run lint` — *actualmente reporta 11 errores conocidos que se corregirán en la Fase 5*.
- **CI:** cada *push* y *pull request* a `main` ejecuta typecheck y build en [GitHub Actions](.github/workflows/ci.yml). El lint corre de forma **informativa** hasta cerrar la deuda técnica.
- **Formato:** [`.editorconfig`](.editorconfig) + [` .gitattributes`](.gitattributes) garantizan UTF-8, LF y sangría de 2 espacios en todos los editores.

---

## 📄 Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/REVISION-2026-10-22.md](docs/REVISION-2026-10-22.md) | Revisión técnica completa, requisitos del cliente (R1–R10), bugs pendientes y plan de ataque |

---

## 🤝 Contribuir

1. Crea una rama: `git checkout -b feature/nombre-cambio`
2. Cambios pequeños y enfocados, con build y lint en verde
3. Abre un *Pull Request* explicando **qué cambia** y **por qué**

---

## 🔒 Seguridad

Los archivos `.env` (credenciales, base de datos) **nunca** se versionan: solo se suben los `.env.example`.

---

## 📝 Licencia

**Todos los derechos reservados.** © 2026 Santiago Castañeda.
Este es un proyecto privado desarrollado para Cheo; no se otorga licencia pública de uso, copia o distribución.
