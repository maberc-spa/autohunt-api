import { describe, it, expect } from "vitest";
import {
  computeCheckDigit,
  decodeCountryCode,
  decodeMake,
  decodeModelYear,
  normalizeVin,
  validateVin,
} from "../../src/utils/vin";

describe("vin utils", () => {
  describe("normalizeVin", () => {
    it("uppercases and strips spaces and dashes", () => {
      expect(normalizeVin(" 1hgcm82633-a004352 ")).toBe("1HGCM82633A004352");
      expect(normalizeVin("wvw zzz 1j z3w 386752")).toBe("WVWZZZ1JZ3W386752");
    });
  });

  describe("computeCheckDigit", () => {
    it("matches known VINs", () => {
      expect(computeCheckDigit("1M8GDM9AXKP042788")).toBe("X");
      expect(computeCheckDigit("1HGCM82633A004352")).toBe("3");
    });
  });

  describe("validateVin", () => {
    it("accepts valid VINs", () => {
      expect(validateVin("1M8GDM9AXKP042788")).toBeNull();
      expect(validateVin("1HGCM82633A004352")).toBeNull();
    });

    it("rejects a wrong check digit on North American VINs", () => {
      expect(validateVin("1HGCM82643A004352")).toBe("checkDigit");
    });

    it("does not enforce the check digit outside North America", () => {
      expect(validateVin("WVWZZZ1JZ3W386752")).toBeNull();
      expect(validateVin("9BWZZZ377VT004251")).toBeNull();
    });

    it("rejects I, O and Q", () => {
      expect(validateVin("WVWZZZ1JZ3W38675O")).toBe("characters");
      expect(validateVin("1HGCM8263QA004352")).toBe("characters");
    });

    it("rejects symbols and injection attempts", () => {
      expect(validateVin("WVW'; DROP TABLE")).toBe("characters");
      expect(validateVin("<script>abc</sc")).toBe("characters");
    });

    it("accepts legacy lengths and rejects anything else", () => {
      expect(validateVin("ABC12345678")).toBeNull();
      expect(validateVin("ABC1234567")).toBe("length");
      expect(validateVin("1HGCM82633A0043521")).toBe("length");
    });
  });

  describe("decodeModelYear", () => {
    it("uses position 7 for North American VINs", () => {
      // Position 7 is a digit → 1980–2009 cycle.
      expect(decodeModelYear("1HGCM82633A004352")).toBe(2003);
      // Position 7 is a letter → 2010–2039 cycle.
      expect(decodeModelYear("5YJ3E1EA7KF317000")).toBe(2019);
    });

    it("assumes the latest non-future year elsewhere", () => {
      expect(decodeModelYear("JTDBR32E0B0123456", 2026)).toBe(2011);
      expect(decodeModelYear("WVWZZZ1JZ3W386752", 2026)).toBe(2003);
      expect(decodeModelYear("WVWZZZ1JZYW386752", 2026)).toBe(2000);
      expect(decodeModelYear("WVWZZZ1JZYW386752", 2030)).toBe(2030);
    });

    it("returns null for unknown codes or legacy VINs", () => {
      expect(decodeModelYear("WVWZZZ1JZUW386752")).toBeNull();
      expect(decodeModelYear("ABC12345678")).toBeNull();
    });
  });

  describe("decodeCountryCode", () => {
    it.each([
      ["1HGCM82633A004352", "USA"],
      ["3N1AB7AP5KY123456", "MEX"],
      ["JTDBR32E0B0123456", "JPN"],
      ["KMHD841CBJU123456", "KOR"],
      ["LGXCE4CB0N0123456", "CHN"],
      ["WVWZZZ1JZ3W386752", "DEU"],
      ["VF3XXXXXXXX123456", "FRA"],
      ["VSSZZZ6JZ8R123456", "ESP"],
      ["ZFA31200000123456", "ITA"],
      ["9BWZZZ377VT004251", "BRA"],
      ["8AJFR22G6J4123456", "ARG"],
    ])("%s → %s", (vin, code) => {
      expect(decodeCountryCode(vin)).toBe(code);
    });

    it("returns null for unknown regions", () => {
      expect(decodeCountryCode("6FPAAAJGCM1234567")).toBeNull();
    });
  });

  describe("decodeMake", () => {
    it("recognizes common WMIs", () => {
      expect(decodeMake("9BWZZZ377VT004251")).toBe("Volkswagen");
      expect(decodeMake("8AJFR22G6J4123456")).toBe("Toyota");
      expect(decodeMake("WDD2050421R123456")).toBe("Mercedes-Benz");
    });

    it("returns null for unknown WMIs", () => {
      expect(decodeMake("XYZ12345678901234")).toBeNull();
    });
  });
});
