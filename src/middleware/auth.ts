import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";
import { verifyToken } from "../utils/jwt";

/**
 * Verifies the bearer token and that it still belongs to a live session: the user must exist
 * and the token must carry the user's current session version (bumped on password change or
 * reset, which signs every other device out).
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Token de autenticación requerido"));
    return;
  }

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    next(new AppError(401, "Tu sesión expiró. Inicia sesión de nuevo."));
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, sessionVersion: true },
    });

    if (!user || user.sessionVersion !== payload.sessionVersion) {
      next(new AppError(401, "Tu sesión expiró. Inicia sesión de nuevo."));
      return;
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};
