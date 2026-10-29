import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const brand = { findFirst: vi.fn(), create: vi.fn() };
const model = { findFirst: vi.fn(), create: vi.fn() };

vi.mock("../../src/config/database", () => ({ prisma: { brand, model } }));

const { resolveBrandAndModel } = await import("../../src/services/vehicle-refs.service");

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "x" });

describe("resolveBrandAndModel", () => {
  beforeEach(() => {
    for (const fn of [brand.findFirst, brand.create, model.findFirst, model.create]) fn.mockReset();
  });

  it("reuses existing rows, ignoring case", async () => {
    brand.findFirst.mockResolvedValue({ id: 1, name: "Toyota", countryId: 2 });
    model.findFirst.mockResolvedValue({ id: 3, name: "RAV4" });

    await expect(
      resolveBrandAndModel({ brandName: "TOYOTA", modelName: "rav4", countryId: 1 })
    ).resolves.toEqual({ brandId: 1, modelId: 3, countryId: 2 });

    expect(brand.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: "TOYOTA", mode: "insensitive" } },
      orderBy: { id: "asc" },
    });
    expect(model.findFirst).toHaveBeenCalledWith({
      where: { brandId: 1, name: { equals: "rav4", mode: "insensitive" } },
      orderBy: { id: "asc" },
    });
    expect(brand.create).not.toHaveBeenCalled();
    expect(model.create).not.toHaveBeenCalled();
  });

  it("creates the brand (with the given origin country) and the model when missing", async () => {
    brand.findFirst.mockResolvedValue(null);
    brand.create.mockResolvedValue({ id: 40, name: "Alpina", countryId: 6 });
    model.findFirst.mockResolvedValue(null);
    model.create.mockResolvedValue({ id: 90, name: "B3" });

    await expect(
      resolveBrandAndModel({ brandName: "Alpina", modelName: "B3", countryId: 6 })
    ).resolves.toEqual({ brandId: 40, modelId: 90, countryId: 6 });

    expect(brand.create).toHaveBeenCalledWith({ data: { name: "Alpina", countryId: 6 } });
    expect(model.create).toHaveBeenCalledWith({ data: { name: "B3", brandId: 40 } });
  });

  it("needs a country to create a brand", async () => {
    brand.findFirst.mockResolvedValue(null);

    await expect(resolveBrandAndModel({ brandName: "Alpina", modelName: "B3" })).rejects.toThrow(
      "Indica el país de origen de la marca"
    );
    expect(brand.create).not.toHaveBeenCalled();
  });

  it("returns the row a concurrent request created first", async () => {
    brand.findFirst.mockResolvedValue({ id: 1, name: "Toyota", countryId: 1 });
    model.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 7, name: "Raize" });
    model.create.mockRejectedValue(uniqueViolation());

    await expect(
      resolveBrandAndModel({ brandName: "Toyota", modelName: "Raize", countryId: 1 })
    ).resolves.toEqual({ brandId: 1, modelId: 7, countryId: 1 });
  });
});
