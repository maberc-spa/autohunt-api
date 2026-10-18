import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import { AppError } from "../utils/errors";

type ValidationTarget = "body" | "params";

export const validate =
  (schema: ZodSchema, target: ValidationTarget = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(
        new AppError(400, "Validación fallida", result.error.flatten().fieldErrors)
      );
      return;
    }

    req[target] = result.data;
    next();
  };

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
