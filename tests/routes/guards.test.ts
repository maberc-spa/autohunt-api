import { describe, it, expect } from "vitest";
import type { Router } from "express";
import { authenticate } from "../../src/middleware/auth";
import { requireAdmin } from "../../src/middleware/require-admin";
import brandRoutes from "../../src/routes/brand.routes";
import countryRoutes from "../../src/routes/country.routes";
import fuelTypeRoutes from "../../src/routes/fuel-type.routes";
import maintenanceTypeRoutes from "../../src/routes/maintenance-type.routes";
import modelRoutes from "../../src/routes/model.routes";
import vehicleTypeRoutes from "../../src/routes/vehicle-type.routes";

type Layer = { route?: { methods: Record<string, boolean>; stack: { handle: unknown }[] } };

const writes = (router: Router) =>
  (router.stack as unknown as Layer[])
    .filter((layer) => layer.route && !layer.route.methods.get)
    .map((layer) => layer.route!.stack.map((s) => s.handle));

describe("shared catalog routes", () => {
  it.each([
    ["brands", brandRoutes],
    ["countries", countryRoutes],
    ["fuel types", fuelTypeRoutes],
    ["maintenance types", maintenanceTypeRoutes],
    ["models", modelRoutes],
    ["vehicle types", vehicleTypeRoutes],
  ])("only let admins write %s", (_name, router) => {
    const handlers = writes(router);
    expect(handlers).toHaveLength(3); // POST, PUT, DELETE
    for (const chain of handlers) {
      expect(chain[0]).toBe(authenticate);
      expect(chain[1]).toBe(requireAdmin);
    }
  });
});
