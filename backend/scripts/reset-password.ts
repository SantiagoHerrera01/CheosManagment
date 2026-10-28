import { PrismaClient } from "@prisma/client";
import "../src/config/database-url.js";
import { hashPassword } from "../src/shared/utils/password.js";

const prisma = new PrismaClient();

const email = process.argv[2];
const plain = process.argv[3];

if (!email || !plain) {
  console.error("Uso: tsx scripts/reset-password.ts <email> <password>");
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error("Usuario no encontrado:", email);
  process.exit(1);
}

await prisma.user.update({
  where: { id: user.id },
  data: { passwordHash: await hashPassword(plain), failedLogins: 0, lockedUntil: null },
});

console.log("OK: contraseña restablecida para", email);
await prisma.$disconnect();
