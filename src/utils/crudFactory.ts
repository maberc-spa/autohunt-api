import { Request, Response } from "express";
import { parseIdParam, sendError } from "./errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDelegate = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any | null>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: { where: { id: number } }) => Promise<any>;
};

type CrudOptions = {
  singular: string;
  plural: string;
  select?: Record<string, boolean>;
  transformCreate?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  transformUpdate?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export const createCrudController = (delegate: PrismaDelegate, options: CrudOptions) => {
  const queryArgs = options.select ? { select: options.select } : undefined;

  return {
    getAll: async (_: Request, res: Response): Promise<void> => {
      try {
        const data = await delegate.findMany(queryArgs);
        res.json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    getById: async (req: Request, res: Response): Promise<void> => {
      try {
        const id = parseIdParam(req.params.id);
        const data = await delegate.findUnique({
          where: { id },
          ...(queryArgs ?? {}),
        });

        if (!data) {
          res.status(404).json({
            success: false,
            message: `${options.singular} no encontrado`,
          });
          return;
        }

        res.json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    create: async (req: Request, res: Response): Promise<void> => {
      try {
        const payload = options.transformCreate
          ? await options.transformCreate(req.body)
          : req.body;

        const data = await delegate.create({
          data: payload,
          ...(queryArgs ?? {}),
        });

        res.status(201).json({
          success: true,
          data,
          message: `${options.singular} creado exitosamente`,
        });
      } catch (error) {
        sendError(res, error);
      }
    },

    update: async (req: Request, res: Response): Promise<void> => {
      try {
        const id = parseIdParam(req.params.id);
        const payload = options.transformUpdate
          ? await options.transformUpdate(req.body)
          : req.body;

        const data = await delegate.update({
          where: { id },
          data: payload,
          ...(queryArgs ?? {}),
        });

        res.json({
          success: true,
          data,
          message: `${options.singular} actualizado exitosamente`,
        });
      } catch (error) {
        sendError(res, error);
      }
    },

    remove: async (req: Request, res: Response): Promise<void> => {
      try {
        const id = parseIdParam(req.params.id);
        await delegate.delete({ where: { id } });

        res.json({
          success: true,
          message: `${options.singular} eliminado exitosamente`,
        });
      } catch (error) {
        sendError(res, error);
      }
    },
  };
};
