import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { verifyToken } from "../utils/jwt";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Token de autenticación requerido"));
    return;
  }

  const token = header.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError(401, "Token inválido o expirado"));
  }
};
