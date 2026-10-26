import dotenv from "dotenv";
import { execSync } from "child_process";
import { Server } from "http";
import app from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { validateEnv } from "./config/env";
import { ensureAdminUser } from "./services/admin-bootstrap.service";

dotenv.config();
validateEnv();

const PORT = process.env.PORT || 3000;

let server: Server | undefined;

const runMigrations = () => {
  if (process.env.NODE_ENV === "production") {
    console.log("Aplicando migraciones...");
    // Invoca el CLI de Prisma directamente: no depende de npm/npx en runtime
    execSync(`"${process.execPath}" node_modules/prisma/build/index.js migrate deploy`, {
      stdio: "inherit",
    });
  }
};

const startServer = async () => {
  try {
    runMigrations();
    await connectDatabase();
    await ensureAdminUser();

    // Iniciar el servidor
    server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Manejar cierre graceful: deja de aceptar conexiones y espera las peticiones en curso
const shutdown = async () => {
  console.log("\n👋 Cerrando servidor...");
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Iniciar la aplicación
startServer();
