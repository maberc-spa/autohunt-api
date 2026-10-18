import dotenv from "dotenv";
import { execSync } from "child_process";
import app from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { validateEnv } from "./config/env";

dotenv.config();
validateEnv();

const PORT = process.env.PORT || 3000;

const runMigrations = () => {
  if (process.env.NODE_ENV === "production") {
    console.log("Aplicando migraciones...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  }
};

const startServer = async () => {
  try {
    runMigrations();
    await connectDatabase();

    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Manejar cierre graceful
process.on("SIGINT", async () => {
  console.log("\n👋 Cerrando servidor...");
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n👋 Cerrando servidor...");
  await disconnectDatabase();
  process.exit(0);
});

// Iniciar la aplicación
startServer();
