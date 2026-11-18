# AGENTS.md · Memoria de trabajo del proyecto

## ⚠️ REGLA MÁS IMPORTANTE
- **NO hacer `git commit` ni `git push` hasta que el usuario lo diga explícitamente.**
  Cuando lo pida, preguntar si quiere "solo commit" o "commit + push".
- **No tirar código** sin aprobación explícita: primero discutir opciones.
- Sin licencia abierta (repo privado del cliente).

## Proyecto
- **Cheo Manager** — ERP de café (facturación / inventario / producción) para Cheo's Café.
- Repo: `https://github.com/SantiagoHerrera01/CheosManagment.git`
- Monorepo: `backend/` (Express + Prisma + PostgreSQL) · `frontend/` (React + Vite + Tailwind) · turbo.
- Un SOLO servicio en Render (back + front misma URL: `https://cheosmanagment.onrender.com`), Swagger en `/api/docs`.
- Documentación en **español**.

## Documentos clave (fuente de verdad)
- `docs/REVISION-2026-10-22.md` — alcance original R1–R10 + §6 preguntas sin responder con el cliente.
- `docs/TODO-DEMO.md` — peticiones post-demo extraídas de 2 audios de voz del cliente (5 nov 2026), priorizadas P0–P3. **Este es el plan de trabajo activo.**

## Acuerdos de UX/producto
- WhatsApp vía link `wa.me` (sin trámites Meta); plantillas centralizadas en `frontend/src/lib/whatsapp.ts`.
- Factura al cliente = **PDF real** (pdfkit, generado al momento desde la BD) + link público firmado HMAC (`share-token.ts`). wa.me no admite adjuntos.
- Login seguro: cookies httpOnly + roles (ADMIN, CONTADOR, VENDEDOR).
- CI con lint tolerante (no romper por warnings).

## Entorno local (dev)
- Servidores: `npm.cmd run dev -w backend` (puerto 3000) · `npm.cmd run dev -w frontend` (5173) — corren en shells de fondo.
- BD: contenedor Docker `cheo-db` (PostgreSQL, puerto 5432, user/pass `cheo`). Si el backend da 500 "Can't reach database", levantar Docker Desktop + `docker start cheo-db`.
- Credenciales dev: `admin@cheo.com` / `CheoAdmin2026!` · `vendedor@cheo.com` / `CheoVende2026!` (cambiar antes de dárselas al cliente).
- Cuenta de prueba: **Santiago Castañeda, 3156643243**.
- PowerShell: usar `npm.cmd`/`npx.cmd`; para SQL con comillas usar archivo pipeado a `docker exec -i cheo-db psql` (PowerShell rompe comillas embebidas).
- Verificación final siempre: `npm.cmd run typecheck` + `npm.cmd run lint` en la raíz = 0 errores.

## Render (plan Free) — limitaciones confirmadas (docs.render.com/docs/free)
- **Web service duerme a los 15 min sin tráfico entrante** → arranque en frío ~1 min (la "lentitud" que reportó el cliente). Soluciones: (a) pinger externo cada 10–14 min (UptimeRobot/cron-job.org) — cabe en las 750 h gratis/mes (24/7 ≈ 744 h), (b) plan Starter $7/mo siempre encendido.
- **Postgres Free EXPIRA a los 30 días de creado** → tras expirar: 14 días de gracia para pasar a plan pago, luego Render **borra la BD con todos los datos**. ¡Ver fecha de creación de `cheosmanagmentdb` en el dashboard!
- **Puertos SMTP 25/465/587 bloqueados en Free** → el correo pendiente (reset contraseña + factura adjunta) NO puede salir por SMTP directo desde Render en plan gratis. Alternativas: API HTTP (Resend/SendGrid/Mailgun) o plan pago.
- 750 h de instancia por mes; superarlas suspende los web services hasta el mes siguiente.

## Estado pendiente del cliente (preguntas abiertas)
- Factura "suma costo": pidió captura + nº de factura (no reproducido en código/BD).
- Mayoreo: ¿cómo calcula el precio de mayoreo?
- "Ustedes no me pueden entender cuando yo les mande el texto": frase ambigua, preguntar.
- Correo SMTP: ¿dominio propio o Gmail/Outlook con contraseña de app? (reset contraseña + factura PDF adjunta).
- Visita presencial: él paga pasajes, explicar Producción en detalle (P3).
