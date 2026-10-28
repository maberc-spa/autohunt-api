/**
 * VIN (ISO 3779) helpers: normalization, validation and the offline part of
 * decoding (manufacturer, country and model year).
 */

export const VIN_LENGTH = 17;
/** Pre-1981 vehicles may carry shorter, non-standard serials. */
export const LEGACY_VIN_MIN_LENGTH = 11;

/** I, O and Q are never used, to avoid confusion with 1 and 0. */
const VIN_CHARS = /^[A-HJ-NPR-Z0-9]+$/;

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Model year codes (position 10), repeating every 30 years from 1980. */
const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";

export type VinIssue = "length" | "characters" | "checkDigit";

export const VIN_ISSUE_MESSAGES: Record<VinIssue, string> = {
  length: "El VIN debe tener 17 caracteres",
  characters: "El VIN solo admite letras y números, sin I, O ni Q",
  checkDigit: "El VIN no es válido: el dígito verificador no coincide",
};

/** Uppercases and drops the spaces and dashes people type when copying it. */
export const normalizeVin = (raw: string): string =>
  raw.toUpperCase().replace(/[\s-]/g, "");

/** North American VINs (WMI 1–5) are required to carry a valid check digit. */
export const isNorthAmericanVin = (vin: string): boolean => /^[1-5]/.test(vin);

export const computeCheckDigit = (vin: string): string => {
  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) {
    const char = vin[i];
    const value = /\d/.test(char) ? Number(char) : TRANSLITERATION[char] ?? 0;
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
};

/**
 * Returns why [vin] (already normalized) is not acceptable, or null if it is.
 * The check digit is only enforced where it is mandatory; elsewhere many
 * manufacturers use position 9 for other data.
 */
export const validateVin = (vin: string): VinIssue | null => {
  if (vin.length < LEGACY_VIN_MIN_LENGTH || vin.length > VIN_LENGTH) {
    return "length";
  }
  if (!VIN_CHARS.test(vin)) return "characters";
  if (
    vin.length === VIN_LENGTH &&
    isNorthAmericanVin(vin) &&
    computeCheckDigit(vin) !== vin[8]
  ) {
    return "checkDigit";
  }
  return null;
};

/**
 * Model year from position 10. Since the code repeats every 30 years, North
 * American VINs disambiguate with position 7 (a letter means 2010 onwards);
 * for the rest, the most recent year that is not in the future is assumed.
 */
export const decodeModelYear = (
  vin: string,
  currentYear = new Date().getFullYear()
): number | null => {
  const index = YEAR_CODES.indexOf(vin[9]);
  if (vin.length !== VIN_LENGTH || index === -1) return null;

  const early = 1980 + index;
  const late = early + 30;
  if (isNorthAmericanVin(vin)) {
    return /[A-Z]/.test(vin[6]) ? late : early;
  }
  return late <= currentYear + 1 ? late : early;
};

/** Ordering used by the ISO 3779 region ranges (e.g. "VF"–"VR"). */
const RANGE_ORDER = "ABCDEFGHJKLMNPRSTUVWXYZ1234567890";

const inRange = (char: string, from: string, to: string): boolean => {
  const index = RANGE_ORDER.indexOf(char);
  return (
    index !== -1 &&
    index >= RANGE_ORDER.indexOf(from) &&
    index <= RANGE_ORDER.indexOf(to)
  );
};

/** ISO 3166-1 alpha-3 code of the country the vehicle was built in. */
export const decodeCountryCode = (vin: string): string | null => {
  const [first, second] = vin;
  if (!first || !second) return null;

  if ("145".includes(first)) return "USA";
  if (first === "2") return "CAN";
  if (first === "3" && inRange(second, "A", "W")) return "MEX";
  if (first === "J") return "JPN";
  if (first === "K" && inRange(second, "L", "R")) return "KOR";
  if (first === "L") return "CHN";
  if (first === "W") return "DEU";
  if (first === "Z" && inRange(second, "A", "R")) return "ITA";
  if (first === "V" && inRange(second, "F", "R")) return "FRA";
  if (first === "V" && inRange(second, "S", "W")) return "ESP";
  if (first === "S" && inRange(second, "A", "M")) return "GBR";
  if (first === "Y" && inRange(second, "S", "W")) return "SWE";
  if (first === "M" && inRange(second, "A", "E")) return "IND";
  if (first === "M" && inRange(second, "F", "K")) return "IDN";
  if (first === "M" && inRange(second, "L", "R")) return "THA";
  if (first === "8" && inRange(second, "A", "E")) return "ARG";
  if (first === "9" && (inRange(second, "A", "E") || inRange(second, "3", "9"))) {
    return "BRA";
  }
  return null;
};

/** World Manufacturer Identifiers (positions 1–3) of the most common makes. */
const WMI_MAKES: Record<string, string> = {
  // Toyota
  JTD: "Toyota", JTE: "Toyota", JTN: "Toyota", JTM: "Toyota", JTK: "Toyota",
  JT2: "Toyota", JT3: "Toyota", "4T1": "Toyota", "4T3": "Toyota",
  "5TD": "Toyota", "5TF": "Toyota", "2T1": "Toyota", "2T3": "Toyota",
  "8AJ": "Toyota", "9BR": "Toyota", MR0: "Toyota", MHF: "Toyota",
  // Honda
  JHM: "Honda", JHL: "Honda", "1HG": "Honda", "2HG": "Honda", "2HK": "Honda",
  "5FN": "Honda", "5J6": "Honda", "19X": "Honda", "93H": "Honda",
  // Nissan
  JN1: "Nissan", JN8: "Nissan", "1N4": "Nissan", "1N6": "Nissan",
  "3N1": "Nissan", "3N6": "Nissan", "5N1": "Nissan", "94D": "Nissan",
  VSK: "Nissan", MNT: "Nissan",
  // Mazda
  JM1: "Mazda", JM3: "Mazda", JMZ: "Mazda", "3MZ": "Mazda",
  // Subaru
  JF1: "Subaru", JF2: "Subaru", "4S3": "Subaru", "4S4": "Subaru",
  // Mitsubishi
  JA3: "Mitsubishi", JA4: "Mitsubishi", JMB: "Mitsubishi", JMY: "Mitsubishi",
  MMB: "Mitsubishi",
  // Suzuki
  JS2: "Suzuki", JS3: "Suzuki", JSA: "Suzuki", MA3: "Suzuki",
  // Volkswagen
  WVW: "Volkswagen", WVG: "Volkswagen", WV1: "Volkswagen", WV2: "Volkswagen",
  "1VW": "Volkswagen", "3VW": "Volkswagen", "9BW": "Volkswagen",
  "8AW": "Volkswagen",
  // BMW
  WBA: "BMW", WBS: "BMW", WBX: "BMW", WBY: "BMW", "5UX": "BMW", "5YM": "BMW",
  // Mercedes-Benz
  WDB: "Mercedes-Benz", WDD: "Mercedes-Benz", WDC: "Mercedes-Benz",
  W1K: "Mercedes-Benz", W1N: "Mercedes-Benz", "4JG": "Mercedes-Benz",
  "55S": "Mercedes-Benz",
  // Audi
  WAU: "Audi", WA1: "Audi", WUA: "Audi",
  // Porsche
  WP0: "Porsche", WP1: "Porsche",
  // Ford
  "1FA": "Ford", "1FT": "Ford", "1FM": "Ford", "1FD": "Ford", "2FM": "Ford",
  "3FA": "Ford", "3FT": "Ford", "9BF": "Ford", "8AF": "Ford", WF0: "Ford",
  MAJ: "Ford",
  // Chevrolet
  "1G1": "Chevrolet", "1GC": "Chevrolet", "1GN": "Chevrolet",
  "2G1": "Chevrolet", "3G1": "Chevrolet", "3GN": "Chevrolet",
  "3GC": "Chevrolet", "9BG": "Chevrolet", "8AG": "Chevrolet",
  KL1: "Chevrolet",
  // Tesla
  "5YJ": "Tesla", "7SA": "Tesla", LRW: "Tesla",
  // Jeep
  "1J4": "Jeep", "1J8": "Jeep",
  // Hyundai
  KMH: "Hyundai", KM8: "Hyundai", "5NP": "Hyundai", "5NM": "Hyundai",
  "9BH": "Hyundai", MAL: "Hyundai",
  // Kia
  KNA: "Kia", KND: "Kia", KNE: "Kia", "5XX": "Kia", "5XY": "Kia", "3KP": "Kia",
  // Stellantis (France / Italy)
  VF3: "Peugeot", "8AD": "Peugeot", VF7: "Citroën", "935": "Citroën",
  ZFA: "Fiat", "9BD": "Fiat", "8AP": "Fiat", ZAR: "Alfa Romeo",
  // Renault
  VF1: "Renault", "93Y": "Renault", "8A1": "Renault",
  // SEAT
  VSS: "SEAT",
  // Chinese makes
  LGX: "BYD", LC0: "BYD", LVV: "Chery", LGW: "Great Wall",
};

export const decodeMake = (vin: string): string | null =>
  WMI_MAKES[vin.slice(0, 3)] ?? null;
