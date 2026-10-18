import { Request, Response } from "express";
import { prisma } from "../config/database";

class HealthController {
  healthCheck(_: Request, res: Response): void {
    res.json({
      success: true,
      message: "🚀 API AutoHunt funcionando correctamente",
      data: {
        service: "AutoHunt API",
        version: "1.0.0",
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
      },
    });
  }

  async readinessCheck(_: Request, res: Response): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: "not ready",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  livenessCheck(_: Request, res: Response): void {
    res.json({
      success: true,
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  }
}

export default new HealthController();
