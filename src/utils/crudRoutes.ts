import { Router, RequestHandler } from "express";
import { ZodSchema } from "zod";
import { createCrudController } from "./crudFactory";
import { validate, idParamSchema } from "../middleware/validate-request";
import { authenticate } from "../middleware/auth";
import { publicReadLimiter } from "../middleware/rate-limit";

type CrudRouteSchemas = {
  create?: ZodSchema;
  update?: ZodSchema;
};

type CrudRouteOptions = {
  publicRead?: boolean;
};

export const createCrudRoutes = (
  controller: ReturnType<typeof createCrudController>,
  schemas?: CrudRouteSchemas,
  options?: CrudRouteOptions
) => {
  const router = Router();
  const readGuards: RequestHandler[] = options?.publicRead
    ? [publicReadLimiter]
    : [authenticate];
  const writeGuards: RequestHandler[] = [authenticate];

  router.get("/", ...readGuards, controller.getAll);
  router.get("/:id", ...readGuards, validate(idParamSchema, "params"), controller.getById);
  router.post(
    "/",
    ...writeGuards,
    ...(schemas?.create ? [validate(schemas.create)] : []),
    controller.create
  );
  router.put(
    "/:id",
    ...writeGuards,
    validate(idParamSchema, "params"),
    ...(schemas?.update ? [validate(schemas.update)] : []),
    controller.update
  );
  router.delete("/:id", ...writeGuards, validate(idParamSchema, "params"), controller.remove);

  return router;
};

type ResourceController = {
  getAll: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
};

export const createProtectedResourceRoutes = (
  controller: ResourceController,
  schemas?: CrudRouteSchemas
) => {
  const router = Router();

  router.use(authenticate);
  router.get("/", controller.getAll);
  router.get("/:id", validate(idParamSchema, "params"), controller.getById);
  router.post("/", ...(schemas?.create ? [validate(schemas.create)] : []), controller.create);
  router.put(
    "/:id",
    validate(idParamSchema, "params"),
    ...(schemas?.update ? [validate(schemas.update)] : []),
    controller.update
  );
  router.delete("/:id", validate(idParamSchema, "params"), controller.remove);

  return router;
};
