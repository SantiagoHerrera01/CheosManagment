import { PrismaClient, Role } from "@prisma/client";

import "../src/config/database-url.js";
import { hashPassword } from "../src/shared/utils/password.js";

const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;
const fullName = process.env.INITIAL_ADMIN_NAME?.trim() || "Administrador";

if (!email || !password) {
  throw new Error(
    "Define INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD para crear el usuario inicial."
  );
}

const prisma = new PrismaClient();

try {
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { fullName, role: Role.ADMIN, passwordHash, isActive: true },
    create: { email, fullName, role: Role.ADMIN, passwordHash, isActive: true },
  });

  console.log(`Usuario administrador listo: ${email}`);
} finally {
  await prisma.$disconnect();
}
