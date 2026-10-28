/**
 * autohunt's vehicle types (table vehicle_type) map to the catalog's body type codes, so the
 * app can ask for the vehicle type first and then only list brands/models of that type.
 */

const normalize = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Normalized vehicle_type.name → auto-db-api body type code. */
export const VEHICLE_TYPE_BODY_CODES: Readonly<Record<string, string>> = {
  sedan: "sedan",
  suv: "suv",
  camioneta: "pickup",
  hatchback: "hatchback",
  coupe: "coupe",
  convertible: "convertible",
  minivan: "minivan",
  furgon: "van",
  crossover: "crossover",
  motocicleta: "motorcycle",
  bus: "bus",
  camion: "truck",
  "station wagon": "wagon",
  "casa rodante": "motorhome",
  remolque: "trailer",
};

/**
 * Codes that are shown together. The catalog follows the EPA split (small SUVs are crossovers:
 * RAV4, CR-V, Tucson), but people call all of them SUVs, so picking either shows both.
 */
const SHOWN_TOGETHER: readonly (readonly string[])[] = [["suv", "crossover"]];

/** The catalog code of the type (what a user submission is filed under). */
export const bodyTypeForVehicleType = (name: string): string | null =>
  VEHICLE_TYPE_BODY_CODES[normalize(name)] ?? null;

/** Codes to filter the catalog by when the user picks this type. */
export const bodyTypesForVehicleType = (name: string): string[] | null => {
  const code = bodyTypeForVehicleType(name);
  if (!code) return null;
  const group = SHOWN_TOGETHER.find((g) => g.includes(code));
  return group ? [code, ...group.filter((c) => c !== code)] : [code];
};

export type VehicleTypeRow = { id: number; name: string; description: string | null };

export type CatalogVehicleType = VehicleTypeRow & {
  /** Catalog body type code, or null if this type isn't mapped to the catalog. */
  bodyType: string | null;
  /**
   * Catalog models shown for this type (summed over the codes shown together, so a model in
   * both groups counts twice); 0 means the app should go straight to free text.
   */
  modelCount: number;
};

/** Joins autohunt's vehicle types with the catalog's /body-types counts. */
export const mergeVehicleTypes = (
  types: VehicleTypeRow[],
  bodyTypes: { code: string; modelCount: number }[]
): CatalogVehicleType[] => {
  const counts = new Map(bodyTypes.map((b) => [b.code, b.modelCount]));
  return types.map((type) => {
    const codes = bodyTypesForVehicleType(type.name) ?? [];
    const modelCount = codes.reduce((sum, code) => sum + (counts.get(code) ?? 0), 0);
    return { ...type, bodyType: codes[0] ?? null, modelCount };
  });
};
