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

export const INTERNAL_ERROR_MESSAGE =
  "Ocurrió un error inesperado. Intenta de nuevo en unos minutos.";

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
        return new AppError(409, "Ese registro ya existe");
      case "P2003":
        return new AppError(400, "Uno de los datos elegidos ya no existe. Recarga e intenta de nuevo.");
      case "P2025":
        return new AppError(404, "Registro no encontrado");
      default:
        console.error(`Error de base de datos ${error.code}:`, error.message);
        return new AppError(500, INTERNAL_ERROR_MESSAGE);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(400, "Datos inválidos para la base de datos");
  }

  // Unexpected: log it, but never send internals (stack, SQL, paths) to the client.
  console.error("Error inesperado:", error);
  return new AppError(500, INTERNAL_ERROR_MESSAGE);
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
