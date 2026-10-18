import { describe, it, expect } from "vitest";
import { deriveDirectUrl } from "../../src/config/env";

describe("deriveDirectUrl", () => {
  it("removes -pooler from Neon host", () => {
    const pooled =
      "postgresql://user:pass@ep-foo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
    expect(deriveDirectUrl(pooled)).toBe(
      "postgresql://user:pass@ep-foo.sa-east-1.aws.neon.tech/neondb?sslmode=require"
    );
  });
});
