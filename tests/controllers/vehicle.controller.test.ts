import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

const resolveBrandAndModel = vi.fn();
const vehicle = { count: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn() };
const user = { findUnique: vi.fn() };

vi.mock("../../src/config/database", () => ({ prisma: { vehicle, user } }));
vi.mock("../../src/services/vehicle-refs.service", () => ({
  resolveBrandAndModel: (...args: unknown[]) => resolveBrandAndModel(...args),
}));

const { default: vehicleController } = await import("../../src/controllers/vehicle.controller");

const fields = { name: "Mi auto", vehicleTypeId: 2, countryId: 1, fuelTypeId: 1 };

describe("VehicleController: brand and model by name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user.findUnique.mockResolvedValue({ id: 5, plan: "FREE", planVehicleLimit: null });
    vehicle.count.mockResolvedValue(0);
    vehicle.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));
    vehicle.update.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));
    resolveBrandAndModel.mockResolvedValue({ brandId: 10, modelId: 20 });
  });

  it("create stores our ids, never the names", async () => {
    const res = createMockResponse();
    await vehicleController.create(
      createMockRequest({
        body: { ...fields, brandName: "Toyota", modelName: "RAV4" },
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
    expect(vehicle.create.mock.calls[0][0].data).toEqual({
      ...fields,
      brandId: 10,
      modelId: 20,
      userId: 5,
    });
  });

  it("create with ids skips the lookup", async () => {
    await vehicleController.create(
      createMockRequest({ body: { ...fields, brandId: 1, modelId: 2 }, user: { userId: 5 } }),
      createMockResponse()
    );
    expect(resolveBrandAndModel).not.toHaveBeenCalled();
    expect(vehicle.create.mock.calls[0][0].data).toMatchObject({ brandId: 1, modelId: 2 });
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
    expect(vehicle.update.mock.calls[0][0].data).toEqual({ brandId: 10, modelId: 20 });
  });
});
