import { Request, Response } from "express";
import { parseIdParam, sendError } from "../utils/errors";
import {
  CatalogResponse,
  vehicleCatalogService,
} from "../services/vehicle-catalog.service";

/** Upstream bodies are `{ data, nextCursor? }`: keep them and add our envelope. */
const send = (res: Response, upstream: CatalogResponse): void => {
  if (upstream.cacheControl) res.set("Cache-Control", upstream.cacheControl);
  res.status(upstream.status).json({ success: true, ...upstream.body });
};

class CatalogController {
  async listBrands(req: Request, res: Response): Promise<void> {
    try {
      send(res, await vehicleCatalogService.get("/brands", req.query));
    } catch (error) {
      sendError(res, error);
    }
  }

  async listModels(req: Request, res: Response): Promise<void> {
    try {
      const brandId = parseIdParam(req.params.brandId, "ID de marca");
      send(res, await vehicleCatalogService.get(`/brands/${brandId}/models`, req.query));
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
      send(res, await vehicleCatalogService.get("/search", req.query));
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
      const upstream = await vehicleCatalogService.post("/submissions", {
        ...req.body,
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
