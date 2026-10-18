import { Request, Response } from "express";
import { prisma } from "../config/database";
import { parseIdParam, sendError } from "../utils/errors";
import { getOwnedMaintenance, getOwnedVehicle } from "../utils/ownership";

class MaintenanceController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const data = await prisma.maintenance.findMany({
        where: { vehicle: { userId: req.user!.userId } },
      });
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const data = await getOwnedMaintenance(id, req.user!.userId);
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleId, ...rest } = req.body;
      await getOwnedVehicle(vehicleId, req.user!.userId);

      const data = await prisma.maintenance.create({
        data: { vehicleId, ...rest },
      });

      res.status(201).json({
        success: true,
        data,
        message: "Mantenimiento creado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const existing = await getOwnedMaintenance(id, req.user!.userId);

      if (req.body.vehicleId && req.body.vehicleId !== existing.vehicleId) {
        await getOwnedVehicle(req.body.vehicleId, req.user!.userId);
      }

      const data = await prisma.maintenance.update({
        where: { id },
        data: req.body,
      });

      res.json({
        success: true,
        data,
        message: "Mantenimiento actualizado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await getOwnedMaintenance(id, req.user!.userId);
      await prisma.maintenance.delete({ where: { id } });

      res.json({
        success: true,
        message: "Mantenimiento eliminado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new MaintenanceController();
