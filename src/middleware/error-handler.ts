import { Request, Response, NextFunction } from "express";
import { AppError, mapPrismaError } from "../utils/errors";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const appError = mapPrismaError(error);

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    ...(appError.details ? { details: appError.details } : {}),
  });
};

export { AppError };
