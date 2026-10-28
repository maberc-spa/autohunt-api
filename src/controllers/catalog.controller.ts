import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError, parseIdParam, sendError } from "../utils/errors";
import {
  CatalogQuery,
  CatalogResponse,
  vehicleCatalogService,
} from "../services/vehicle-catalog.service";
import {
  bodyTypeForVehicleType,
  bodyTypesForVehicleType,
  mergeVehicleTypes,
} from "../utils/vehicle-type-catalog";

/** Upstream bodies are `{ data, nextCursor? }`: keep them and add our envelope. */
const send = (res: Response, upstream: CatalogResponse): void => {
  if (upstream.cacheControl) res.set("Cache-Control", upstream.cacheControl);
  res.status(upstream.status).json({ success: true, ...upstream.body });
};

const findVehicleType = async (raw: unknown) => {
  const id = parseIdParam(String(raw), "ID de tipo de vehículo");
  const type = await prisma.vehicleType.findUnique({ where: { id } });
  if (!type) throw new AppError(404, "Tipo de vehículo no encontrado");
  return type;
};

/** `?vehicleTypeId=` (our id) becomes the catalog's `?body_type=` (its codes). */
const withBodyType = async (query: Request["query"]): Promise<CatalogQuery> => {
  const { vehicleTypeId, ...rest } = query;
  if (vehicleTypeId === undefined) return rest;
  const type = await findVehicleType(vehicleTypeId);
  const bodyTypes = bodyTypesForVehicleType(type.name);
  if (!bodyTypes) {
    throw new AppError(400, `El tipo de vehículo "${type.name}" no está en el catálogo`);
  }
  return { ...rest, body_type: bodyTypes.join(",") };
};

class CatalogController {
  /**
   * First step of the "add vehicle" form: our vehicle types with how many catalog models
   * each one has. The app then passes `vehicleTypeId` to brands, models and search.
   */
  async listVehicleTypes(_req: Request, res: Response): Promise<void> {
    try {
      const [types, upstream] = await Promise.all([
        prisma.vehicleType.findMany({
          select: { id: true, name: true, description: true },
          orderBy: { id: "asc" },
        }),
        vehicleCatalogService.get("/body-types"),
      ]);
      const bodyTypes = (upstream.body.data ?? []) as { code: string; modelCount: number }[];
      if (upstream.cacheControl) res.set("Cache-Control", upstream.cacheControl);
      res.status(200).json({ success: true, data: mergeVehicleTypes(types, bodyTypes) });
    } catch (error) {
      sendError(res, error);
    }
  }

  async listBrands(req: Request, res: Response): Promise<void> {
    try {
      send(res, await vehicleCatalogService.get("/brands", await withBodyType(req.query)));
    } catch (error) {
      sendError(res, error);
    }
  }

  async listModels(req: Request, res: Response): Promise<void> {
    try {
      const brandId = parseIdParam(req.params.brandId, "ID de marca");
      send(
        res,
        await vehicleCatalogService.get(`/brands/${brandId}/models`, await withBodyType(req.query))
      );
    } catch (error) {
      sendError(res, error);
    }
  }

  async listYears(req: Request, res: Response): Promise<void> {
    try {
      const modelId = parseIdParam(req.params.modelId, "ID de modelo");
      send(res, await vehicleCatalogService.get(`/models/${modelId}/years`));
    } catch (error) {
      sendError(res, error);
    }
  }

  async listVariants(req: Request, res: Response): Promise<void> {
    try {
      const modelId = parseIdParam(req.params.modelId, "ID de modelo");
      send(res, await vehicleCatalogService.get(`/models/${modelId}/variants`, req.query));
    } catch (error) {
      sendError(res, error);
    }
  }

  async getVariant(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id, "ID de variante");
      send(res, await vehicleCatalogService.get(`/variants/${id}`));
    } catch (error) {
      sendError(res, error);
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      send(res, await vehicleCatalogService.get("/search", await withBodyType(req.query)));
    } catch (error) {
      sendError(res, error);
    }
  }

  async listEnums(_req: Request, res: Response): Promise<void> {
    try {
      send(res, await vehicleCatalogService.get("/enums"));
    } catch (error) {
      sendError(res, error);
    }
  }

  /** "No encuentro mi auto". The user reference is set here, never by the client. */
  async createSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleTypeId, ...body } = req.body;
      // The type the user picked helps file the model under the right category on approval.
      const bodyType =
        vehicleTypeId === undefined
          ? null
          : bodyTypeForVehicleType((await findVehicleType(vehicleTypeId)).name);
      const upstream = await vehicleCatalogService.post("/submissions", {
        ...body,
        ...(bodyType ? { bodyType } : {}),
        userRef: `autohunt:user:${req.user!.userId}`,
      });
      res.set("Cache-Control", "no-store");
      res.status(upstream.status).json({ success: true, ...upstream.body });
    } catch (error) {
      sendError(res, error);
    }
  }

  /** Admin passthrough: /api/admin/catalog/<path> → /admin/<path>. */
  async adminProxy(req: Request, res: Response): Promise<void> {
    try {
      const upstream = await vehicleCatalogService.admin(
        req.method,
        req.path,
        req.user!.email,
        { query: req.query, body: req.body }
      );
      res.set("Cache-Control", "no-store");
      res.status(upstream.status).json({ success: true, ...upstream.body });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new CatalogController();
