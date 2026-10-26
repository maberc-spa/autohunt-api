import { describe, it, expect } from "vitest";
import { countByDay, windowStart } from "../../src/utils/stats";

const now = new Date("2026-10-26T15:30:00Z");

describe("stats utils", () => {
  it("windowStart returns UTC midnight of the oldest day", () => {
    expect(windowStart(1, now).toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(windowStart(7, now).toISOString()).toBe("2026-10-20T00:00:00.000Z");
  });

  it("countByDay zero-fills every day, oldest first", () => {
    const result = countByDay([], 3, now);
    expect(result).toEqual([
      { date: "2026-10-24", count: 0 },
      { date: "2026-10-25", count: 0 },
      { date: "2026-10-26", count: 0 },
    ]);
  });

  it("countByDay groups dates and ignores those outside the window", () => {
    const result = countByDay(
      [
        new Date("2026-10-26T01:00:00Z"),
        new Date("2026-10-26T23:59:59Z"),
        new Date("2026-10-25T12:00:00Z"),
        new Date("2026-10-01T12:00:00Z"),
      ],
      2,
      now
    );
    expect(result).toEqual([
      { date: "2026-10-25", count: 1 },
      { date: "2026-10-26", count: 2 },
    ]);
  });
});
