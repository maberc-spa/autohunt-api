import { describe, it, expect, vi } from "vitest";
import {
  VinDecoderService,
  mapBodyType,
  mapFuelType,
} from "../../src/services/vin-decoder.service";

const vpicResponse = (values: Record<string, string>) =>
  new Response(JSON.stringify({ Results: [values] }), { status: 200 });

const corolla = {
  Make: "TOYOTA",
  Model: "Corolla",
  ModelYear: "2019",
  DisplacementL: "1.798",
  FuelTypePrimary: "Gasoline",
  BodyClass: "Sedan/Saloon",
  VehicleType: "PASSENGER CAR",
};

describe("VinDecoderService", () => {
  it("merges vPIC data over the local decode", async () => {
    const fetchFn = vi.fn().mockResolvedValue(vpicResponse(corolla));
    const service = new VinDecoderService(fetchFn);

    const result = await service.decode("JTDBR32E0K0123456");

    expect(result).toEqual({
      vin: "JTDBR32E0K0123456",
      make: "Toyota",
      model: "Corolla",
      year: 2019,
      countryCode: "JPN",
      displacementL: 1.8,
      fuelType: "gasoline",
      bodyType: "sedan",
      source: "nhtsa",
    });
    expect(fetchFn.mock.calls[0][0]).toContain("/DecodeVinValues/JTDBR32E0K0123456");
  });

  it("title-cases makes missing from the WMI table", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(vpicResponse({ ...corolla, Make: "LAND ROVER" }));
    const service = new VinDecoderService(fetchFn);

    const result = await service.decode("SALGS2SV0JA123456");
    expect(result.make).toBe("Land Rover");
  });

  it("falls back to the local decode when vPIC does not know the VIN", async () => {
    const fetchFn = vi.fn().mockResolvedValue(vpicResponse({ Make: "" }));
    const service = new VinDecoderService(fetchFn);

    const result = await service.decode("9BWZZZ37735004251");

    expect(result).toMatchObject({
      make: "Volkswagen",
      model: null,
      year: 2003,
      countryCode: "BRA",
      source: "local",
    });
  });

  it("falls back to the local decode when vPIC fails, without caching", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(vpicResponse(corolla));
    const service = new VinDecoderService(fetchFn);

    const first = await service.decode("JTDBR32E0K0123456");
    const second = await service.decode("JTDBR32E0K0123456");

    expect(first.source).toBe("local");
    expect(second.source).toBe("nhtsa");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("treats non-2xx responses as failures", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
    const service = new VinDecoderService(fetchFn);

    const result = await service.decode("JTDBR32E0K0123456");
    expect(result.source).toBe("local");
  });

  it("caches successful lookups", async () => {
    const fetchFn = vi.fn().mockResolvedValue(vpicResponse(corolla));
    const service = new VinDecoderService(fetchFn);

    await service.decode("JTDBR32E0K0123456");
    await service.decode("JTDBR32E0K0123456");

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("mapFuelType", () => {
  it.each([
    [{ FuelTypePrimary: "Gasoline" }, "gasoline"],
    [{ FuelTypePrimary: "Flexible Fuel Vehicle (FFV)" }, "gasoline"],
    [{ FuelTypePrimary: "Diesel" }, "diesel"],
    [{ FuelTypePrimary: "Electric" }, "electric"],
    [{ FuelTypePrimary: "Compressed Natural Gas (CNG)" }, "cng"],
    [{ FuelTypePrimary: "Liquefied Petroleum Gas (propane or LPG)" }, "lpg"],
    [{ FuelTypePrimary: "Gasoline", ElectrificationLevel: "Strong HEV (Hybrid Electric Vehicle)" }, "hybrid"],
    [{ FuelTypePrimary: "Gasoline", ElectrificationLevel: "PHEV (Plug-in Hybrid Electric Vehicle)" }, "hybrid"],
    [{ ElectrificationLevel: "BEV (Battery Electric Vehicle)" }, "electric"],
    [{}, null],
  ])("%j → %s", (values, expected) => {
    expect(mapFuelType(values)).toBe(expected);
  });
});

describe("mapBodyType", () => {
  it.each([
    [{ BodyClass: "Sedan/Saloon" }, "sedan"],
    [{ BodyClass: "Hatchback/Liftback/Notchback" }, "hatchback"],
    [{ BodyClass: "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)" }, "suv"],
    [{ BodyClass: "Crossover Utility Vehicle (CUV)" }, "crossover"],
    [{ BodyClass: "Pickup" }, "pickup"],
    [{ BodyClass: "Minivan" }, "minivan"],
    [{ BodyClass: "Cargo Van" }, "van"],
    [{ BodyClass: "Convertible/Cabriolet" }, "convertible"],
    [{ BodyClass: "Motorcycle - Sport" }, "motorcycle"],
    [{ BodyClass: "Truck-Tractor" }, "truck"],
    [{ VehicleType: "BUS" }, "bus"],
    [{ BodyClass: "Incomplete" }, null],
  ])("%j → %s", (values, expected) => {
    expect(mapBodyType(values)).toBe(expected);
  });
});
