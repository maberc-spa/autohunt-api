import { prisma } from "../config/database";
import { hashPassword } from "../utils/password";

/**
 * Ensures the account in ADMIN_EMAIL exists and has the ADMIN role.
 *
 * - If the user exists, it is promoted to ADMIN (its password is left untouched).
 * - If not, it is created with ADMIN_PASSWORD (required in that case).
 *
 * Does nothing when ADMIN_EMAIL is not set.
 */
export const ensureAdminUser = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
      console.log(`👑 Usuario ${email} promovido a administrador`);
    }
    return;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.warn(
      "⚠️  ADMIN_EMAIL no existe y ADMIN_PASSWORD falta o tiene menos de 8 caracteres: no se creó el administrador"
    );
    return;
  }

  const username = await availableUsername(
    process.env.ADMIN_USERNAME?.trim() || "admin"
  );

  await prisma.user.create({
    data: {
      email,
      username,
      firstName: "Admin",
      lastName: "AutoHunt",
      name: "Admin AutoHunt",
      emailVerified: true,
      role: "ADMIN",
      password: await hashPassword(password),
    },
  });
  console.log(`👑 Administrador ${email} creado (usuario: ${username})`);
};

const availableUsername = async (base: string): Promise<string> => {
  let candidate = base;
  for (let suffix = 1; await prisma.user.findUnique({ where: { username: candidate } }); suffix++) {
    candidate = `${base}${suffix}`;
  }
  return candidate;
};
