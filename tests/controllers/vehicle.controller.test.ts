import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

const resolveBrandAndModel = vi.fn();
const vehicle = { count: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn() };
const user = { findUnique: vi.fn() };
const brand = { findUnique: vi.fn() };

vi.mock("../../src/config/database", () => ({ prisma: { vehicle, user, brand } }));
vi.mock("../../src/services/vehicle-refs.service", () => ({
  resolveBrandAndModel: (...args: unknown[]) => resolveBrandAndModel(...args),
}));

const { default: vehicleController } = await import("../../src/controllers/vehicle.controller");

const fields = { name: "Mi auto", vehicleTypeId: 2, fuelTypeId: 1 };

describe("VehicleController: brand and model by name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user.findUnique.mockResolvedValue({ id: 5, plan: "FREE", planVehicleLimit: null, countryId: 4 });
    vehicle.count.mockResolvedValue(0);
    vehicle.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));
    vehicle.update.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));
    resolveBrandAndModel.mockResolvedValue({ brandId: 10, modelId: 20, countryId: 7 });
    brand.findUnique.mockResolvedValue({ countryId: 8 });
  });

  it("create stores our ids, never the names", async () => {
    const res = createMockResponse();
    await vehicleController.create(
      createMockRequest({
        body: { ...fields, countryId: 1, brandName: "Toyota", modelName: "RAV4" },
        user: { userId: 5 },
      }),
      res
    );

    expect(res.statusCode).toBe(201);
    expect(resolveBrandAndModel).toHaveBeenCalledWith({
      brandName: "Toyota",
      modelName: "RAV4",
      countryId: 1,
    });
    // The vehicle takes its brand's country, not the one sent for a new brand.
    expect(vehicle.create.mock.calls[0][0].data).toEqual({
      ...fields,
      brandId: 10,
      modelId: 20,
      countryId: 7,
      userId: 5,
    });
  });

  it("create falls back to the user's country for a new brand", async () => {
    await vehicleController.create(
      createMockRequest({
        body: { ...fields, brandName: "Alpina", modelName: "B3" },
        user: { userId: 5 },
      }),
      createMockResponse()
    );
    expect(resolveBrandAndModel).toHaveBeenCalledWith({
      brandName: "Alpina",
      modelName: "B3",
      countryId: 4,
    });
  });

  it("create with ids skips the lookup", async () => {
    await vehicleController.create(
      createMockRequest({ body: { ...fields, brandId: 1, modelId: 2 }, user: { userId: 5 } }),
      createMockResponse()
    );
    expect(resolveBrandAndModel).not.toHaveBeenCalled();
    expect(vehicle.create.mock.calls[0][0].data).toMatchObject({
      brandId: 1,
      modelId: 2,
      countryId: 8,
    });
  });

  it("update falls back to the vehicle's country for a new brand", async () => {
    vehicle.findFirst.mockResolvedValue({ id: 1, userId: 5, countryId: 3 });
    await vehicleController.update(
      createMockRequest({
        params: { id: "1" },
        body: { brandName: "Alpina", modelName: "B3" },
        user: { userId: 5 },
      }),
      createMockResponse()
    );
    expect(resolveBrandAndModel).toHaveBeenCalledWith({
      brandName: "Alpina",
      modelName: "B3",
      countryId: 3,
    });
    expect(vehicle.update.mock.calls[0][0].data).toEqual({ brandId: 10, modelId: 20, countryId: 7 });
  });

  it("update without a brand ignores a sent country", async () => {
    vehicle.findFirst.mockResolvedValue({ id: 1, userId: 5, countryId: 3 });
    await vehicleController.update(
      createMockRequest({ params: { id: "1" }, body: { countryId: 9, mileage: 100 }, user: { userId: 5 } }),
      createMockResponse()
    );
    expect(vehicle.update.mock.calls[0][0].data).toEqual({ mileage: 100 });
  });
});
