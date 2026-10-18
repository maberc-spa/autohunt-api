import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conectado a la base de datos PostgreSQL");
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error);
    process.exit(1);
  }
};

export const disconnectDatabase = async () => {
  await prisma.$disconnect();
  console.log("Desconectado de la base de datos");
};
