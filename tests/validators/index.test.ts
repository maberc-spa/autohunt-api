import { describe, it, expect } from "vitest";
import {
  createCountrySchema,
  createUserSchema,
  createVehicleSchema,
  createMaintenanceSchema,
  createUserMaintenanceSchema,
  loginSchema,
} from "../../src/validators";

describe("validators", () => {
  describe("createCountrySchema", () => {
    it("accepts valid country", () => {
      const result = createCountrySchema.safeParse({ name: "Chile", code: "CHL" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createCountrySchema.safeParse({ name: "", code: "CHL" });
      expect(result.success).toBe(false);
    });
  });

  describe("createUserSchema", () => {
    it("accepts valid user", () => {
      const result = createUserSchema.safeParse({
        username: "juanp",
        firstName: "Juan",
        lastName: "Pérez",
        email: "juan@example.com",
        password: "password123",
        countryId: 1,
      });
      expect(result.success).toBe(true);
    });

    it("rejects short password", () => {
      const result = createUserSchema.safeParse({
        username: "juanp",
        firstName: "Juan",
        lastName: "Pérez",
        email: "juan@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = createUserSchema.safeParse({
        username: "juanp",
        firstName: "Juan",
        lastName: "Pérez",
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createVehicleSchema", () => {
    it("accepts valid vehicle without userId", () => {
      const result = createVehicleSchema.safeParse({
        name: "Mi auto",
        brandId: "2",
        modelId: "3",
        vehicleTypeId: "4",
        countryId: "1",
        fuelTypeId: "1",
        year: "2024",
        mileage: "0",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("userId");
      }
    });

    it("rejects invalid year", () => {
      const result = createVehicleSchema.safeParse({
        brandId: 1,
        modelId: 1,
        vehicleTypeId: 1,
        year: 1800,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createMaintenanceSchema", () => {
    it("coerces performedAt to Date", () => {
      const result = createMaintenanceSchema.safeParse({
        vehicleId: 1,
        performedAt: "2024-06-15T10:00:00.000Z",
        totalCost: "89.99",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.performedAt).toBeInstanceOf(Date);
        expect(result.data.totalCost).toBe(89.99);
      }
    });
  });

  describe("createUserMaintenanceSchema", () => {
    it("accepts valid roles without userId", () => {
      const result = createUserMaintenanceSchema.safeParse({
        maintenanceId: 1,
        role: "MECHANIC",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid role", () => {
      const result = createUserMaintenanceSchema.safeParse({
        maintenanceId: 1,
        role: "ADMIN",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid login payload", () => {
      const result = loginSchema.safeParse({
        identifier: "user@example.com",
        password: "secret",
      });
      expect(result.success).toBe(true);
    });
  });
});
