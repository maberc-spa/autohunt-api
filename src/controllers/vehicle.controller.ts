import { Request, Response } from "express";
import { prisma } from "../config/database";
import { parseIdParam, sendError } from "../utils/errors";
import { getOwnedVehicle } from "../utils/ownership";
import { getMaxVehiclesForPlan } from "../services/plan-limits";
import { AppError } from "../utils/errors";

const vehicleInclude = {
  brand: { select: { id: true, name: true } },
  model: { select: { id: true, name: true } },
  vehicleType: { select: { id: true, name: true } },
  country: { select: { id: true, name: true } },
  fuelType: { select: { id: true, name: true } },
} as const;

class VehicleController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const data = await prisma.vehicle.findMany({
        where: { userId: req.user!.userId },
        include: vehicleInclude,
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await getOwnedVehicle(id, req.user!.userId);
      const data = await prisma.vehicle.findUnique({
        where: { id },
        include: vehicleInclude,
      });
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });

      if (!user) {
        throw new AppError(404, "Usuario no encontrado");
      }

      const count = await prisma.vehicle.count({
        where: { userId: user.id },
      });
      const maxVehicles = getMaxVehiclesForPlan(
        user.plan,
        user.planVehicleLimit
      );

      if (count >= maxVehicles) {
        throw new AppError(
          403,
          `Has alcanzado el límite de ${maxVehicles} vehículo(s) de tu plan`
        );
      }

      const data = await prisma.vehicle.create({
        data: { ...req.body, userId: req.user!.userId },
        include: vehicleInclude,
      });

      res.status(201).json({
        success: true,
        data,
        message: "Vehículo creado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await getOwnedVehicle(id, req.user!.userId);

      const { userId: _userId, ...data } = req.body;
      const result = await prisma.vehicle.update({
        where: { id },
        data,
        include: vehicleInclude,
      });

      res.json({
        success: true,
        data: result,
        message: "Vehículo actualizado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await getOwnedVehicle(id, req.user!.userId);
      await prisma.vehicle.delete({ where: { id } });

      res.json({
        success: true,
        message: "Vehículo eliminado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new VehicleController();
