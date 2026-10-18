import { describe, it, expect, beforeEach } from "vitest";
import { signToken, verifyToken } from "../../src/utils/jwt";

describe("jwt utils", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
  });

  it("signs and verifies tokens", () => {
    const payload = { userId: 42, email: "user@example.com" };
    const token = signToken(payload);
    expect(verifyToken(token)).toEqual(payload);
  });
});
