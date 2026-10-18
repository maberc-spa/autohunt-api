import { prisma } from "../config/database";
import { AppError } from "./errors";

export const getOwnedVehicle = async (vehicleId: number, userId: number) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
  });

  if (!vehicle) {
    throw new AppError(404, "Vehículo no encontrado");
  }

  return vehicle;
};

export const getOwnedMaintenance = async (maintenanceId: number, userId: number) => {
  const maintenance = await prisma.maintenance.findFirst({
    where: {
      id: maintenanceId,
      vehicle: { userId },
    },
  });

  if (!maintenance) {
    throw new AppError(404, "Mantenimiento no encontrado");
  }

  return maintenance;
};

export const getOwnedMaintenanceDetail = async (detailId: number, userId: number) => {
  const detail = await prisma.maintenanceDetail.findFirst({
    where: {
      id: detailId,
      maintenance: { vehicle: { userId } },
    },
  });

  if (!detail) {
    throw new AppError(404, "Detalle de mantenimiento no encontrado");
  }

  return detail;
};

export const getOwnedUserMaintenance = async (id: number, userId: number) => {
  const record = await prisma.userMaintenance.findFirst({
    where: { id, userId },
  });

  if (!record) {
    throw new AppError(404, "Mantenimiento de usuario no encontrado");
  }

  return record;
};
