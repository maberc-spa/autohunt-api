import { describe, it, expect, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../../src/utils/jwt";

describe("jwt utils", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
  });

  it("signs and verifies tokens", () => {
    const payload = { userId: 42, email: "user@example.com", sessionVersion: 3 };
    const token = signToken(payload);
    expect(verifyToken(token)).toEqual(payload);
  });

  it("treats tokens without a session version as version 0", () => {
    const token = jwt.sign({ userId: 1, email: "a@b.cl" }, process.env.JWT_SECRET!);
    expect(verifyToken(token).sessionVersion).toBe(0);
  });

  it("rejects tokens signed with another algorithm", () => {
    const token = jwt.sign({ userId: 1, email: "a@b.cl" }, process.env.JWT_SECRET!, {
      algorithm: "HS512",
    });
    expect(() => verifyToken(token)).toThrow();
  });
});
