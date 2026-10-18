import { Request, Response } from "express";
import { prisma } from "../config/database";
import { parseIdParam, sendError } from "../utils/errors";
import {
  getOwnedMaintenance,
  getOwnedUserMaintenance,
} from "../utils/ownership";

class UserMaintenanceController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const data = await prisma.userMaintenance.findMany({
        where: { userId: req.user!.userId },
      });
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const data = await getOwnedUserMaintenance(id, req.user!.userId);
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { maintenanceId, role } = req.body;
      await getOwnedMaintenance(maintenanceId, req.user!.userId);

      const data = await prisma.userMaintenance.create({
        data: {
          userId: req.user!.userId,
          maintenanceId,
          role,
        },
      });

      res.status(201).json({
        success: true,
        data,
        message: "Mantenimiento de usuario creado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await getOwnedUserMaintenance(id, req.user!.userId);

      const { role } = req.body;
      const data = await prisma.userMaintenance.update({
        where: { id },
        data: { role },
      });

      res.json({
        success: true,
        data,
        message: "Mantenimiento de usuario actualizado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await getOwnedUserMaintenance(id, req.user!.userId);
      await prisma.userMaintenance.delete({ where: { id } });

      res.json({
        success: true,
        message: "Mantenimiento de usuario eliminado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new UserMaintenanceController();
