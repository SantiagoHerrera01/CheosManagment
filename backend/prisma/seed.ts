/**
 * Seed inicial de Cheo Manager.
 *
 * Uso:  npm run db:seed -w backend
 *
 * Crea:
 *  - Usuario administrador y vendedor (credenciales IMPRESAS en consola: cámbialas)
 *  - Cliente "Consumidor Final"
 *  - Catálogo base de café con presentaciones, precios y stock
 *
 * Es idempotente: si ya existe un registro lo actualiza en vez de duplicarlo.
 */
import { PrismaClient, Role, Grind } from "@prisma/client";

import { hashPassword } from "../src/shared/utils/password.js";

const prisma = new PrismaClient();

async function seedUsers() {
  const users = [
    {
      email: "admin@cheo.com",
      fullName: "Administrador",
      role: Role.ADMIN,
      password: "CheoAdmin2026!",
    },
    {
      email: "vendedor@cheo.com",
      fullName: "Vendedor Principal",
      role: Role.VENDEDOR,
      password: "CheoVende2026!",
    },
  ];

  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role },
      create: { email: u.email, fullName: u.fullName, role: u.role, passwordHash },
    });
    console.log(`  ✔ ${user.role.padEnd(8)} ${user.email}`);
  }
}

async function seedClient() {
  await prisma.client.upsert({
    where: { documentNumber: "2222222222" },
    update: { fullName: "Consumidor Final" },
    create: {
      documentType: "CC",
      documentNumber: "2222222222",
      fullName: "Consumidor Final",
      phone: "000 000 0000",
      city: "Medellín",
      department: "Antioquia",
    },
  });
  console.log("  ✔ Cliente  Consumidor Final");
}

/** Catálogo base (los precios se ajustan desde la app). */
const catalog = [
  {
    name: "Café Castillo",
    variety: "Castillo",
    process: "Lavado",
    presentations: [
      { label: "250 g", grind: Grind.MOLIDO, price: 12900, cost: 8000, stock: 100, minimumStock: 20 },
      { label: "250 g", grind: Grind.GRANO, price: 12900, cost: 8000, stock: 100, minimumStock: 20 },
      { label: "500 g", grind: Grind.GRANO, price: 24900, cost: 15000, stock: 60, minimumStock: 10 },
      { label: "1 kg", grind: Grind.GRANO, price: 47900, cost: 29000, stock: 40, minimumStock: 10 },
    ],
  },
  {
    name: "Café Chiroso Urrao",
    variety: "Chiroso",
    process: "Natural",
    presentations: [
      { label: "250 g", grind: Grind.GRANO, price: 19900, cost: 12000, stock: 60, minimumStock: 20 },
      { label: "500 g", grind: Grind.GRANO, price: 38900, cost: 23000, stock: 30, minimumStock: 10 },
    ],
  },
  {
    name: "Café Papayo Honey",
    variety: "Papayo",
    process: "Honey",
    presentations: [
      // Stock por debajo del mínimo a propósito: sirve para probar las alertas (R8)
      { label: "250 g", grind: Grind.MOLIDO, price: 17900, cost: 11000, stock: 12, minimumStock: 20 },
      { label: "250 g", grind: Grind.GRANO, price: 17900, cost: 11000, stock: 25, minimumStock: 20 },
    ],
  },
];

async function seedProducts() {
  for (const p of catalog) {
    const product = await prisma.product.upsert({
      where: { id: `seed-${p.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: { variety: p.variety, process: p.process },
      create: {
        id: `seed-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: p.name,
        variety: p.variety,
        process: p.process,
        presentations: { create: p.presentations },
      },
    });
    console.log(`  ✔ Producto ${product.name} (${p.presentations.length} presentaciones)`);
  }
}

async function main() {
  console.log("\n🌱 Sembrando base de datos de Cheo Manager...\n");
  console.log("Usuarios:");
  await seedUsers();
  console.log("\nClientes:");
  await seedClient();
  console.log("\nProductos:");
  await seedProducts();

  console.log(`
──────────────────────────────────────────────────────
  ✅  Seed completado

  👤  admin@cheo.com    / CheoAdmin2026!     (ADMIN)
  👤  vendedor@cheo.com / CheoVende2026!     (VENDEDOR)

  ⚠️  Son credenciales de DESARROLLO. En producción
     crea usuarios reales y cambia estas contraseñas.
──────────────────────────────────────────────────────
`);
}

main()
  .catch((error) => {
    console.error("❌ Error en el seed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
