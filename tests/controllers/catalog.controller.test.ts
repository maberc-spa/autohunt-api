import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

const findUnique = vi.fn();
const findMany = vi.fn();
const get = vi.fn();
const post = vi.fn();

vi.mock("../../src/config/database", () => ({
  prisma: {
    vehicleType: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

vi.mock("../../src/services/vehicle-catalog.service", () => ({
  vehicleCatalogService: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

const { default: catalogController } = await import(
  "../../src/controllers/catalog.controller"
);

const upstream = (body: Record<string, unknown>, status = 200) => ({
  body,
  status,
  cacheControl: "public, max-age=300",
});

const response = () => {
  const res = createMockResponse() as ReturnType<typeof createMockResponse> & {
    headers: Record<string, string>;
    set(name: string, value: string): unknown;
  };
  res.headers = {};
  res.set = function (name: string, value: string) {
    this.headers[name] = value;
    return this;
  };
  return res;
};

describe("CatalogController: vehicle type first", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    get.mockReset();
    post.mockReset();
  });

  it("GET /vehicle-types joins our types with the catalog counts", async () => {
    findMany.mockResolvedValue([
      { id: 1, name: "Sedán", description: null },
      { id: 13, name: "Camión", description: null },
    ]);
    get.mockResolvedValue(
      upstream({ data: [{ code: "sedan", label: "Sedán", modelCount: 42 }] })
    );
    const res = response();

    await catalogController.listVehicleTypes(createMockRequest(), res);

    expect(get).toHaveBeenCalledWith("/body-types");
    expect(res.statusCode).toBe(200);
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
    expect(res.body).toEqual({
      success: true,
      data: [
        { id: 1, name: "Sedán", description: null, bodyType: "sedan", modelCount: 42 },
        { id: 13, name: "Camión", description: null, bodyType: "truck", modelCount: 0 },
      ],
    });
  });

  it("translates vehicleTypeId into the catalog's body_type for brands, models and search", async () => {
    findUnique.mockResolvedValue({ id: 13, name: "Camión" });
    get.mockResolvedValue(upstream({ data: [] }));

    await catalogController.listBrands(
      createMockRequest({ query: { vehicleTypeId: "13", limit: "50" } }),
      response()
    );
    await catalogController.listModels(
      createMockRequest({ params: { brandId: "7" }, query: { vehicleTypeId: "13" } }),
      response()
    );
    await catalogController.search(
      createMockRequest({ query: { q: "volvo", vehicleTypeId: "13" } }),
      response()
    );

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 13 } });
    expect(get.mock.calls).toEqual([
      ["/brands", { limit: "50", body_type: "truck" }],
      ["/brands/7/models", { body_type: "truck" }],
      ["/search", { q: "volvo", body_type: "truck" }],
    ]);
  });

  it("SUV also lists crossovers (RAV4, CR-V…)", async () => {
    findUnique.mockResolvedValue({ id: 2, name: "SUV" });
    get.mockResolvedValue(upstream({ data: [] }));
    await catalogController.listBrands(
      createMockRequest({ query: { vehicleTypeId: "2" } }),
      response()
    );
    expect(get).toHaveBeenCalledWith("/brands", { body_type: "suv,crossover" });
  });

  it("without vehicleTypeId the query goes through untouched", async () => {
    get.mockResolvedValue(upstream({ data: [] }));
    await catalogController.listBrands(createMockRequest({ query: { limit: "5" } }), response());
    expect(findUnique).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith("/brands", { limit: "5" });
  });

  it("404 for an unknown vehicle type, 400 for one the catalog doesn't cover", async () => {
    findUnique.mockResolvedValueOnce(null);
    const missing = response();
    await catalogController.listBrands(
      createMockRequest({ query: { vehicleTypeId: "999" } }),
      missing
    );
    expect(missing.statusCode).toBe(404);

    findUnique.mockResolvedValueOnce({ id: 50, name: "Tractor agrícola" });
    const unmapped = response();
    await catalogController.listBrands(
      createMockRequest({ query: { vehicleTypeId: "50" } }),
      unmapped
    );
    expect(unmapped.statusCode).toBe(400);

    const invalid = response();
    await catalogController.listBrands(
      createMockRequest({ query: { vehicleTypeId: "abc" } }),
      invalid
    );
    expect(invalid.statusCode).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it("submissions send the picked type as bodyType, never vehicleTypeId", async () => {
    findUnique.mockResolvedValue({ id: 13, name: "Camión" });
    post.mockResolvedValue(upstream({ data: { id: 1 } }, 201));
    const res = response();

    await catalogController.createSubmission(
      createMockRequest({
        body: { brand: "Volvo", model: "FH16", year: 2022, vehicleTypeId: 13 },
        user: { userId: 5, email: "u@example.com" },
      }),
      res
    );

    expect(res.statusCode).toBe(201);
    expect(post).toHaveBeenCalledWith("/submissions", {
      brand: "Volvo",
      model: "FH16",
      year: 2022,
      bodyType: "truck",
      userRef: "autohunt:user:5",
    });
  });
});
