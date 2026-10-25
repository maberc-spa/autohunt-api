import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";

/**
 * Must run after `authenticate`. The role is read from the database on every
 * request (not from the JWT) so revoking admin access takes effect immediately.
 */
export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    next(new AppError(401, "Token de autenticación requerido"));
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      next(new AppError(403, "Acceso restringido a administradores"));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
