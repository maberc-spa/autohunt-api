import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isRateLimitSkipped } from "../../src/middleware/rate-limit";

describe("rate limiters", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("skips limiting in test environment", () => {
    process.env.NODE_ENV = "test";
    expect(isRateLimitSkipped()).toBe(true);
  });

  it("applies limiting outside test environment", () => {
    process.env.NODE_ENV = "development";
    expect(isRateLimitSkipped()).toBe(false);
  });
});
