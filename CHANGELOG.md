# 📋 Changelog

Todos los cambios notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-1.1.0/),
versionado [Semántico](https://semver.org/lang/es/).

## [No publicado] — En desarrollo

### ✅ Agregado
- Estructura profesional del repositorio: `.gitignore` raíz, `.gitattributes`, `.editorconfig`.
- `README.md` con requisitos del cliente, estructura, scripts y roadmap.
- Plantillas de GitHub: issues (bug/feature) y pull requests.
- Workflow de CI en GitHub Actions (typecheck + build; lint informativo).
- `dependabot.yml` para actualización de dependencias.
- `.env.example` para `backend/` y `frontend/`.
- `CONTRIBUTING.md`, `SECURITY.md` y este `CHANGELOG.md`.
- Documento de revisión técnica y requisitos: `docs/REVISION-2026-10-22.md`.
- Scripts raíz para levantar backend/frontend y operar Prisma.

### 🔧 Cambiado
- Vinculación del repositorio local con `origin` (la URL anterior estaba corrupta).
- Rama local renombrada de `master` a `main` para alinear con el remoto.

### 🐛 Conocido (pendiente en Fase 5)
- `npm run lint` reporta 11 errores (9 `no-explicit-any`, 2 de React Compiler).
- El módulo de ventas no persiste ventas ni ediciones (UI sobre datos mock).
- `npm start` del backend falla por imports ESM sin extensión `.js`.

---

## [0.1.0] — 2026-10-22

### ✅ Agregado
- Importación inicial: frontend (React 19 + Vite + Tailwind) con 11 rutas:
  Dashboard, Ventas, Clientes, Productos, Inventario, Producción, Cartera,
  Bancos, Compras, Reportes y Configuración.
- Backend esqueleto: Express 5 + TypeScript + Prisma 6 + PostgreSQL con
  endpoint `GET /api` y modelo `Client`.
- Transcripción de los 11 audios de requisitos del cliente.
