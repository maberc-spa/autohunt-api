import { Request, Response, NextFunction } from "express";
import { AppError, mapPrismaError } from "../utils/errors";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Malformed JSON bodies and oversized payloads come from express itself.
  const status = (error as { status?: number; type?: string })?.status;
  if (status === 400 || status === 413) {
    res.status(status).json({
      success: false,
      message: status === 413 ? "La solicitud es demasiado grande" : "Solicitud mal formada",
    });
    return;
  }

  const appError = mapPrismaError(error);

  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    ...(appError.details ? { details: appError.details } : {}),
  });
};

export { AppError };
