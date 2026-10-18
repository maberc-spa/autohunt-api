import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const parseIdParam = (raw: string, label = "ID"): number => {
  const id = parseInt(raw, 10);
  if (Number.isNaN(id) || id <= 0) {
    throw new AppError(400, `${label} inválido`);
  }
  return id;
};

export const mapPrismaError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return new AppError(409, "Registro duplicado", error.meta);
      case "P2003":
        return new AppError(400, "Referencia inválida", error.meta);
      case "P2025":
        return new AppError(404, "Registro no encontrado");
      default:
        return new AppError(400, "Error de base de datos", {
          code: error.code,
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(400, "Datos inválidos para la base de datos");
  }

  if (error instanceof Error) {
    return new AppError(500, error.message);
  }

  return new AppError(500, "Error desconocido");
};

export const sendError = (
  res: import("express").Response,
  error: unknown
): void => {
  const appError = mapPrismaError(error);
  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    ...(appError.details ? { details: appError.details } : {}),
  });
};
