import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

/**
 * Must run after `authenticate`, which reads the role from the database on every request
 * (never from the JWT), so revoking admin access takes effect immediately.
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new AppError(401, "Token de autenticación requerido"));
    return;
  }

  if (req.user.role !== "ADMIN") {
    next(new AppError(403, "Acceso restringido a administradores"));
    return;
  }

  next();
};
