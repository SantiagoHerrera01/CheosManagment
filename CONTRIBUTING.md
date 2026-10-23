# 🤝 Contribuir a Cheo Manager

Gracias por mejorar este proyecto. Este documento define el flujo de trabajo esperado.

## 📋 Previo

1. Instala **Node.js 22 LTS** y **PostgreSQL 14+**.
2. Clona el repo y levanta el proyecto siguiendo el [README](README.md).
3. Copia los `.env.example` a `.env` en `backend/` y `frontend/`.

## 🌲 Ramas

| Rama | Para qué |
|------|----------|
| `main` | Siempre estable; es lo que se despliega. **Nunca commitear directo.** |
| `feature/<nombre>` | Nueva funcionalidad. Ej: `feature/facturacion-abonos` |
| `fix/<nombre>` | Corrección de bugs. Ej: `fix/descuento-negativo` |
| `chore/<nombre>` | Tareas de mantenimiento (config, dependencias, docs). |
| `docs/<nombre>` | Solo documentación. |

## ✅ Checklist de todo cambio

- [ ] `npm run build` compila sin errores (backend y frontend).
- [ ] `npm run lint` no agrega **nuevos** errores.
- [ ] No se commitean archivos `.env`, `node_modules/` ni secrets.
- [ ] Los cambios de base de datos incluyen su migración de Prisma (`npm run db:migrate`).
- [ ] Los componentes nuevos tienen estados de carga y error.
- [ ] UI nueva verificada en **desktop y móvil** (el sistema se usa en campo).

## 📝 Commits (Convención Conventional Commits)

```
<tipo>: <descripción corta en imperativo>

tipos: feat | fix | refactor | docs | chore | test | style | perf
```

Ejemplos:

```
feat: búsqueda de cliente por cédula en el módulo de ventas
fix: el descuento negativo ya no infla el total de la factura
chore: agregar workflow de CI
docs: requisitos del cliente en docs/
```

Puedes agregar un ámbito: `feat(ventas): …`, `fix(inventario): …`.

## 🔀 Pull Requests

1. Abre la PR con la **plantilla** que provee GitHub.
2. Describe **qué cambia** y **por qué**.
3. Vincula el issue que resuelve (`Closes #12`).
4. El CI debe quedar **verde** antes del merge.
5. Revisión por el mantenedor antes de fusionar a `main`.

## 🧪 Datos de prueba

- Nunca subas datos reales de clientes a seeds o fixtures.
- Usa datos de ejemplo claramente ficticios.

## 📚 Convenciones

- **TypeScript estricto**: evitar `any`; si es inevitable, justificarlo en comentario.
- **Español** en nombres de rutas, textos de UI y documentación (el producto es en español).
- **English** en nombres de archivos, funciones y variables de código.
- Componentes de React en `PascalCase`, hooks en `use*.ts`, tipos en `types/`.
- No duplicar catálogos: una sola fuente de verdad por dato.
