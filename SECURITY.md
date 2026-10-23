# 🔒 Seguridad

## Reportar una vulnerabilidad

**No crees un issue público** para reportar una vulnerabilidad.

Envía un correo al mantenedor con:

- Asunto: `[SEGURIDAD] <resumen>`
- Descripción del problema y su impacto
- Pasos para reproducirlo
- Versión/commit afectado
- Posible solución (si la tienes)

Responderemos lo antes posible y coordinaremos la divulgación.

## Alcance

Este es un proyecto privado con datos sensibles de un negocio (clientes, facturas, costos).

Reglas internas:

- 🔐 **Nunca** commitear archivos `.env`, credenciales, tokens ni certificados.
- 🗄️ La base de datos de desarrollo no debe contener datos reales de clientes.
- 🧑‍💼 Antes de producción se debe definir autenticación, autorización por rol y respaldos.
- 📦 Revisar dependencias (`npm audit`) antes de cada release.

## Dependencias

Usa:

```bash
npm audit
npm audit fix
```
