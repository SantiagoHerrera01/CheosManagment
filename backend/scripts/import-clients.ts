/**
 * Importador de clientes desde un archivo JSON.
 *
 * Uso:
 *   npm run import:clients -w backend -- <ruta/al/archivo.json>
 *
 * El JSON debe ser un arreglo de objetos con esta forma:
 *   [
 *     {
 *       "documentType": "CC" | "NIT" | "CE" | "PASSPORT",
 *       "documentNumber": "1036624094",
 *       "fullName": "LUZ MIGDONIA CARVAJAL OQUENDO",
 *       "phone": "3117225948" | null,
 *       "email": "correo@ejemplo.com" | null,
 *       "city": "MEDELLÍN" | null,
 *       "department": "Antioquia" | null,
 *       "address": "CRA 83 # 48 sur 27" | null
 *     }
 *   ]
 *
 * Es idempotente: upsert por `documentNumber`. Si el cliente ya existe,
 * actualiza sus datos. Los registros inválidos se reportan y se omiten
 * sin abortar la importación completa.
 *
 * (Si tu fuente es un .xls/.xlsx, conviértelo a JSON antes: pandas + xlrd
 * resuelven en dos líneas, o se puede exportar a CSV y parsearlo.)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RawClient {
  documentType?: string;
  documentNumber?: string;
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  department?: string | null;
  address?: string | null;
}

const VALID_TYPES = ["CC", "NIT", "CE", "PASSPORT"];

function normalize(row: RawClient, index: number) {
  const problems: string[] = [];

  const doc = String(row.documentNumber ?? "").replace(/\D/g, "");
  if (doc.length < 5) problems.push("documentNumber inválido");

  const name = String(row.fullName ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 3) problems.push("fullName vacío o muy corto");

  const type = String(row.documentType ?? "CC").toUpperCase().trim();
  if (!VALID_TYPES.includes(type)) problems.push(`documentType desconocido: ${type}`);

  const phone = String(row.phone ?? "").replace(/\D/g, "") || null;
  const email = String(row.email ?? "").trim().toLowerCase() || null;

  if (problems.length > 0) {
    return { index, problems, data: null };
  }

  return {
    index,
    problems,
    data: {
      documentType: type as "CC" | "NIT" | "CE" | "PASSPORT",
      documentNumber: doc,
      fullName: name,
      phone,
      email: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
      city: String(row.city ?? "").trim().toUpperCase() || null,
      department: String(row.department ?? "").trim() || null,
      address: String(row.address ?? "").trim() || null,
    },
  };
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Uso: npm run import:clients -w backend -- <ruta/al/archivo.json>");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), fileArg);
  const rows: RawClient[] = JSON.parse(readFileSync(filePath, "utf-8"));
  if (!Array.isArray(rows)) {
    throw new Error("El archivo JSON debe contener un arreglo de clientes.");
  }

  console.log(`\n📥 Importando ${rows.length} clientes desde ${filePath}\n`);

  let created = 0;
  let updated = 0;
  const skipped: Array<{ index: number; problems: string[] }> = [];

  for (const [i, raw] of rows.entries()) {
    const { problems, data } = normalize(raw, i);
    if (!data) {
      skipped.push({ index: i + 2, problems }); // +2: 1 por cabecera, 1 por índice base 1
      continue;
    }

    const existing = await prisma.client.findUnique({
      where: { documentNumber: data.documentNumber },
      select: { id: true },
    });

    if (existing) {
      await prisma.client.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.client.create({ data });
      created += 1;
    }
  }

  console.log("──────────────────────────────────────────────");
  console.log(`  ✅  Creados : ${created}`);
  console.log(`  ♻️  Actualizados : ${updated}`);
  console.log(`  ⚠️  Omitidos : ${skipped.length}`);
  console.log("──────────────────────────────────────────────");

  if (skipped.length > 0) {
    console.log("\nRegistros omitidos:");
    for (const s of skipped) {
      console.log(`  fila ${s.index}: ${s.problems.join(", ")}`);
    }
  }

  const total = await prisma.client.count();
  console.log(`\nTotal de clientes en la base: ${total}\n`);
}

main()
  .catch((error) => {
    console.error("❌ Error importando:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
