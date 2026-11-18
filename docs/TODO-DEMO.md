# To-do post-demo · peticiones del cliente

> **Fuente:** 2 notas de voz del cliente (`aud1 pasos siguientes.ogg`, `aud2 pasos siguientes 2.ogg`,
> 5 nov 2026), transcritas y analizadas. Son correcciones, añadidos y cambios que pidió
> **después de ver la demo**. Ordenado por prioridad.
>
> Documento de alcance previo: [`REVISION-2026-10-22.md`](./REVISION-2026-10-22.md).

---

## P0 · Bugs reportados (verificar antes de corregir)

### 1. "La factura suma el COSTO, no el precio de venta"
- **Qué dijo:** *"A mí me vale hacer una bolsa a 10.000 y la factura está sumando 10.000, no los 18.900 que yo la vendo. En algunos está mal montado."*
- **Estado:** ❌ **No reproducido.** El código usa siempre `presentation.price` (precio de venta) en `invoices.service.ts` y en `SaleProducts.tsx`; Compras solo actualiza `cost`, nunca `price`. Auditoría SQL en **dev y producción**: ninguna presentación real con precio ≤ costo (solo un producto de prueba `R5` en dev).
- **Acción:** pedirle **captura + número de factura** exacto donde lo vio. Posible confusión con el total del **Inventario valorizado al costo** (ese sí suma `stock × cost`, es correcto).
- [ ] Recibir evidencia del cliente y re-verificar

### 2. "No deja modificar los costos de producción"
- **Qué dijo:** *"Compro el bourbon a 24.000 y a veces a 27.000; que me deje modificar el costo."*
- **Estado:** ✅ **Resuelto** (5 nov): botón **"Actualizar costo"** por fila en Inventario (solo ADMIN) → modal con costo actual/nuevo → `PATCH /products/:id/presentations/:presentationId`. Verificado de punta a punta (7.500 → 7.000 → restaurado).
- [x] Definir dónde se edita el costo y construirlo

---

## P1 · Correcciones y añadidos pedidos

### 3. Varios precios (mayoreo)
- *"Yo vendo al por mayor más barato, tengo varios precios. Hay que cargar esa opción."*
- **Estado:** ✅ **Resuelto** (5 nov): campo `wholesalePrice` opcional por presentación (precio manual). En Productos se configura al crear/editar; en Nueva venta aparece chip "Mayoreo $ X — aplicar" por línea del carrito. El backend resuelve el precio desde la BD (nunca del cliente). Verificado end-to-end (47.900 → 11.500 → factura F-000006 unitPrice=11500 → anulada + restaurado).
- [x] Definir regla y construir mayoreo

### 4. Catálogo de presentaciones: 1 kg + grano/molido en todo
- *"Hay que añadir la opción de un kilo… todo el café lo manejo en grano o molido y hay que dar todas esas opciones."*
- [x] Select de **tamaños** (250 g / 500 g / 1 kg / 2 kg / 5 kg) + campo libre en crear producto (`lib/catalog.ts`) — verificado
- [x] Molienda grano/molido ya era select (existente)
- [x] Botón **"Agregar presentaciones (N)"** por producto: modal plantilla con las combinaciones faltantes (tamaño × molienda), precio sugerido del mismo tamaño, desmarcables — verificado (5 faltantes → creé 1 → limpié el dato de prueba)

### 5. Actualizar costo desde Inventario
- *"En los inventarios hay que subir un valor, un nuevo costo."*
- [x] **Resuelto** (5 nov): ver ítem 2 de P0 — botón + modal de costo en Inventario

### 6. Profundizar Producción (aud2 — su pedido más grande)
- *"Producción es donde está más básica. Quiero poner café pergamino, ingresé tanto pergamino y se lo compré a tal productor; después está la TRILLA: lo mandé trillar y me quedaron tantos kilos; esos kilos hay que meterlos al tueste."*
- [ ] Materia prima con **proveedor** (quién lo vendió) — hoy solo hay `rawMaterialPresentationId`
- [ ] Etapas con nombre/tipo libres o ampliados: pergamino → **trilla** → **tueste** (hoy el enum de etapas es limitado — verificar `ProductionStageType`)
- [ ] Registrar kg de entrada y salida **por etapa** con merma (parcialmente existe: `ProductionStage` ya guarda input/output/waste)
- [ ] Costo acumulado de producción por orden (suma materia prima + gastos de la etapa) → conecta con P0-2

---

## P2 · Rendimiento y experiencia

### 7. Inicio/login lento
- *"El inicio es muy lento, parece que no cargaba… ese día pensamos que estaba malo."*
- [x] **Diagnóstico:** es el **sleep de Render Free** (15 min sin tráfico → ~1 min de arranque). No es bug nuestro. Opciones anotadas en `AGENTS.md`: pinger gratis cada 14 min o plan Starter $7/mes. **El usuario decidió posponer la decisión.**

### 8. ✅ Factura gráfica para el cliente — RESUELTO
- *Preguntó a Betty si "es muy caro" mandarle una factura gráfica y no solo texto.*
- **Hecho:** factura **PDF real** generada desde la BD (encabezado, tabla de productos, totales, saldo, abonos) + **link de descarga firmado** (`?download=1` → el cliente lo toca y se guarda el archivo) incluido en el mensaje de WhatsApp y botón "Ver factura PDF" en el detalle de venta.
- [ ] **Comunicarle al cliente:** ya está, y es **gratis** (no cuesta nada mandar el link — wa.me no admite adjuntos, el link se toca y descarga el PDF)

---

## P3 · Coordinación

### 9. Visita presencial
- *"Yo le pago los pasajes y me siento con él dos horitas acá en la casa a explicarle todo eso al detalle."*
- [ ] Coordinar fecha de visita (él paga pasajes; explicar Producción en detalle)

---

## Preguntas abiertas para el cliente

1. **"Ustedes no me pueden entender cuando yo les mande el texto"** — frase ambigua en aud1. ¿Se refiere a que manda mensajes y no le responden? ¿a algún formato? **Preguntar.**
2. Del P0-1: ¿en qué factura vio el costo en vez del precio? (captura + número)
3. ~~Del P1-3: ¿cómo calcula el precio de mayoreo?~~ → Resuelto: precio manual por presentación (decisión del usuario).
4. ¿La lentitud del inicio pasa también en la app publicada (Render) o solo en local?

---

## Orden sugerido de ataque

1. P0-1 → pedir evidencia (mientras tanto no se rompe nada)
2. P0-2 + P1-5 + P1-4 (editar costo / catálogo) — son mejoras al mismo flujo de Inventario/Productos
3. P1-6 Producción (el más grande: requiere migración de esquema)
4. P2-7 lentitud (diagnóstico primero)
5. P1-3 mayoreo (definir regla con el cliente)
6. P3 coordinar visita
