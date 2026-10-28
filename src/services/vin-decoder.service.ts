import {
  decodeCountryCode,
  decodeMake,
  decodeModelYear,
} from "../utils/vin";

/** Catalog-agnostic keys; the client maps them to its own catalog names. */
export type VinFuelType = "gasoline" | "diesel" | "electric" | "hybrid" | "lpg" | "cng";
export type VinBodyType =
  | "sedan"
  | "hatchback"
  | "suv"
  | "crossover"
  | "pickup"
  | "coupe"
  | "convertible"
  | "wagon"
  | "minivan"
  | "van"
  | "truck"
  | "bus"
  | "motorcycle";

export type VinDecodeResult = {
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  countryCode: string | null;
  displacementL: number | null;
  fuelType: VinFuelType | null;
  bodyType: VinBodyType | null;
  /** "nhtsa" when the vPIC database recognized the VIN, "local" otherwise. */
  source: "nhtsa" | "local";
};

type VpicValues = Record<string, string | null | undefined>;

const VPIC_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";
const VPIC_TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

const text = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_match, separator: string, letter: string) =>
      separator + letter.toUpperCase()
    );

export const mapFuelType = (values: VpicValues): VinFuelType | null => {
  const electrification = values.ElectrificationLevel?.toUpperCase() ?? "";
  if (electrification.includes("BEV")) return "electric";
  if (electrification.includes("HEV")) return "hybrid";

  const fuel = values.FuelTypePrimary?.toLowerCase() ?? "";
  if (fuel.includes("diesel")) return "diesel";
  if (fuel.includes("electric")) return "electric";
  if (fuel.includes("natural gas") || fuel.includes("cng")) return "cng";
  if (fuel.includes("lpg") || fuel.includes("propane")) return "lpg";
  if (/gasoline|flexible|ethanol/.test(fuel)) return "gasoline";
  return null;
};

/** Ordered: the first match wins ("Minivan" before "Van", etc.). */
const BODY_PATTERNS: [RegExp, VinBodyType][] = [
  [/motorcycle/, "motorcycle"],
  [/pickup/, "pickup"],
  [/crossover/, "crossover"],
  [/sport utility|\bsuv\b/, "suv"],
  [/minivan/, "minivan"],
  [/\bvan\b/, "van"],
  [/hatchback/, "hatchback"],
  [/sedan/, "sedan"],
  [/coupe/, "coupe"],
  [/convertible|cabriolet|roadster/, "convertible"],
  [/wagon/, "wagon"],
  [/\bbus\b/, "bus"],
  [/truck/, "truck"],
];

export const mapBodyType = (values: VpicValues): VinBodyType | null => {
  const candidates = [values.BodyClass, values.VehicleType];
  for (const candidate of candidates) {
    const value = candidate?.toLowerCase();
    if (!value) continue;
    const match = BODY_PATTERNS.find(([pattern]) => pattern.test(value));
    if (match) return match[1];
  }
  return null;
};

const decodeLocally = (vin: string): VinDecodeResult => ({
  vin,
  make: decodeMake(vin),
  model: null,
  year: decodeModelYear(vin),
  countryCode: decodeCountryCode(vin),
  displacementL: null,
  fuelType: null,
  bodyType: null,
  source: "local",
});

/** Overlays what vPIC knows on top of the offline decode. */
export const mergeVpicValues = (
  local: VinDecodeResult,
  values: VpicValues
): VinDecodeResult => {
  const make = text(values.Make);
  if (!make) return local;

  const year = Number(values.ModelYear);
  const displacement = Number(values.DisplacementL);

  return {
    ...local,
    // vPIC returns uppercase: keep the WMI table's spelling when they agree.
    make: local.make?.toUpperCase() === make.toUpperCase()
      ? local.make
      : titleCase(make),
    model: text(values.Model),
    year: Number.isInteger(year) && year > 0 ? year : local.year,
    displacementL:
      Number.isFinite(displacement) && displacement > 0
        ? Math.round(displacement * 10) / 10
        : null,
    fuelType: mapFuelType(values),
    bodyType: mapBodyType(values),
    source: "nhtsa",
  };
};

type CacheEntry = { value: VinDecodeResult; expiresAt: number };

export class VinDecoderService {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  private readonly cache = new Map<string, CacheEntry>();

  /** [vin] must already be normalized and validated as a 17-character VIN. */
  async decode(vin: string): Promise<VinDecodeResult> {
    const cached = this.cache.get(vin);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const local = decodeLocally(vin);
    let values: VpicValues;
    try {
      values = await this.fetchVpic(vin);
    } catch (error) {
      // vPIC is a best-effort enrichment: never fail the request over it,
      // and don't cache so the next attempt can still reach it.
      if (process.env.NODE_ENV !== "production") {
        console.warn("vPIC no disponible:", error);
      }
      return local;
    }

    const result = mergeVpicValues(local, values);
    this.remember(vin, result);
    return result;
  }

  private async fetchVpic(vin: string): Promise<VpicValues> {
    const response = await this.fetchFn(
      `${VPIC_URL}/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(VPIC_TIMEOUT_MS) }
    );
    if (!response.ok) {
      throw new Error(`vPIC respondió ${response.status}`);
    }
    const payload = (await response.json()) as { Results?: VpicValues[] };
    return payload.Results?.[0] ?? {};
  }

  private remember(vin: string, value: VinDecodeResult): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Maps iterate in insertion order: drop the oldest entry.
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(vin, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }
}

export const vinDecoderService = new VinDecoderService();
