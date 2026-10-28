import { describe, it, expect } from "vitest";
import {
  createCountrySchema,
  createUserSchema,
  createVehicleSchema,
  createMaintenanceSchema,
  createUserMaintenanceSchema,
  loginSchema,
  updateUserSchema,
  changePasswordSchema,
  vinDecodeParamsSchema,
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

  describe("updateUserSchema", () => {
    it("accepts names and phone", () => {
      const result = updateUserSchema.safeParse({
        firstName: "Juan",
        lastName: "Pérez",
        phone: "+56 9 1234 5678",
      });
      expect(result.success).toBe(true);
    });

    it("accepts clearing the phone", () => {
      expect(updateUserSchema.safeParse({ phone: "" }).success).toBe(true);
      expect(updateUserSchema.safeParse({ phone: null }).success).toBe(true);
    });

    it("rejects invalid phone", () => {
      const result = updateUserSchema.safeParse({ phone: "abc123" });
      expect(result.success).toBe(false);
    });

    it("accepts username, email and current password", () => {
      const result = updateUserSchema.safeParse({
        username: "juan_p",
        email: " juan@example.com ",
        currentPassword: "secret",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        username: "juan_p",
        email: "juan@example.com",
        currentPassword: "secret",
      });
    });

    it("rejects invalid username and email", () => {
      expect(updateUserSchema.safeParse({ username: "a b" }).success).toBe(false);
      expect(updateUserSchema.safeParse({ username: "ab" }).success).toBe(false);
      expect(updateUserSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    });

    it("strips password, role and plan", () => {
      const result = updateUserSchema.safeParse({
        password: "password123",
        role: "ADMIN",
        plan: "PREMIUM_TIER_3",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });
  });

  describe("changePasswordSchema", () => {
    it("accepts valid payload", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "old-password",
        newPassword: "Password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short new password", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "old-password",
        newPassword: "short",
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

  describe("vehicle vin", () => {
    const vehicle = {
      name: "Auto",
      brandId: 1,
      modelId: 1,
      vehicleTypeId: 1,
      countryId: 1,
      fuelTypeId: 1,
    };

    it("normalizes the VIN before storing it", () => {
      const result = createVehicleSchema.safeParse({
        ...vehicle,
        vin: " 1hgcm82633-a004352 ",
      });
      expect(result.success).toBe(true);
      expect(result.data?.vin).toBe("1HGCM82633A004352");
    });

    it("rejects an invalid check digit", () => {
      const result = createVehicleSchema.safeParse({
        ...vehicle,
        vin: "1HGCM82643A004352",
      });
      expect(result.success).toBe(false);
    });

    it("still accepts a null VIN", () => {
      const result = createVehicleSchema.safeParse({ ...vehicle, vin: null });
      expect(result.success).toBe(true);
    });
  });

  describe("vinDecodeParamsSchema", () => {
    it("accepts a full VIN", () => {
      const result = vinDecodeParamsSchema.safeParse({ vin: "9bwzzz377vt004251" });
      expect(result.data?.vin).toBe("9BWZZZ377VT004251");
    });

    it("rejects legacy VINs, which can't be decoded", () => {
      const result = vinDecodeParamsSchema.safeParse({ vin: "ABC12345678" });
      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
    });
  });
});
