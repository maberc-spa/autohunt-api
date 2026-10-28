import { describe, it, expect } from "vitest";
import {
  bodyTypeForVehicleType,
  bodyTypesForVehicleType,
  mergeVehicleTypes,
} from "../../src/utils/vehicle-type-catalog";

describe("bodyTypeForVehicleType", () => {
  it.each([
    ["Sedán", "sedan"],
    ["Camioneta", "pickup"],
    ["Furgón", "van"],
    ["Camión", "truck"],
    ["Bus", "bus"],
    ["  station   WAGON ", "wagon"],
    ["Casa rodante", "motorhome"],
    ["Remolque", "trailer"],
  ])("maps %s → %s", (name, code) => {
    expect(bodyTypeForVehicleType(name)).toBe(code);
  });

  it("returns null for types the catalog doesn't know", () => {
    expect(bodyTypeForVehicleType("Tractor agrícola")).toBeNull();
  });
});

describe("bodyTypesForVehicleType", () => {
  it("SUV and Crossover show both groups, with their own code first", () => {
    expect(bodyTypesForVehicleType("SUV")).toEqual(["suv", "crossover"]);
    expect(bodyTypesForVehicleType("Crossover")).toEqual(["crossover", "suv"]);
  });

  it("other types filter by their own code only", () => {
    expect(bodyTypesForVehicleType("Camión")).toEqual(["truck"]);
    expect(bodyTypesForVehicleType("Tractor agrícola")).toBeNull();
  });
});

describe("mergeVehicleTypes", () => {
  it("adds the catalog code and model count to each type", () => {
    const merged = mergeVehicleTypes(
      [
        { id: 1, name: "Sedán", description: null },
        { id: 2, name: "SUV", description: null },
        { id: 13, name: "Camión", description: "Carga" },
        { id: 99, name: "Tractor agrícola", description: null },
      ],
      [
        { code: "sedan", modelCount: 120 },
        { code: "suv", modelCount: 30 },
        { code: "crossover", modelCount: 50 },
        { code: "truck", modelCount: 0 },
      ]
    );
    expect(merged).toEqual([
      { id: 1, name: "Sedán", description: null, bodyType: "sedan", modelCount: 120 },
      { id: 2, name: "SUV", description: null, bodyType: "suv", modelCount: 80 },
      { id: 13, name: "Camión", description: "Carga", bodyType: "truck", modelCount: 0 },
      { id: 99, name: "Tractor agrícola", description: null, bodyType: null, modelCount: 0 },
    ]);
  });
});
