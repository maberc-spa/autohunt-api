import { Request, Response } from "express";
import { prisma } from "../config/database";
import { parseIdParam, sendError } from "../utils/errors";
import {
  getOwnedMaintenance,
  getOwnedMaintenanceDetail,
} from "../utils/ownership";

class MaintenanceDetailController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const data = await prisma.maintenanceDetail.findMany({
        where: { maintenance: { vehicle: { userId: req.user!.userId } } },
      });
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const data = await getOwnedMaintenanceDetail(id, req.user!.userId);
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { maintenanceId, ...rest } = req.body;
      await getOwnedMaintenance(maintenanceId, req.user!.userId);

      const data = await prisma.maintenanceDetail.create({
        data: { maintenanceId, ...rest },
      });

      res.status(201).json({
        success: true,
        data,
        message: "Detalle de mantenimiento creado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const existing = await getOwnedMaintenanceDetail(id, req.user!.userId);

      if (req.body.maintenanceId && req.body.maintenanceId !== existing.maintenanceId) {
        await getOwnedMaintenance(req.body.maintenanceId, req.user!.userId);
      }

      const data = await prisma.maintenanceDetail.update({
        where: { id },
        data: req.body,
      });

      res.json({
        success: true,
        data,
        message: "Detalle de mantenimiento actualizado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await getOwnedMaintenanceDetail(id, req.user!.userId);
      await prisma.maintenanceDetail.delete({ where: { id } });

      res.json({
        success: true,
        message: "Detalle de mantenimiento eliminado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new MaintenanceDetailController();
