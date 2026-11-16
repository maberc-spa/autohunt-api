import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppError } from "../../src/utils/errors";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";
import { signToken } from "../../src/utils/jwt";

const findUnique = vi.fn();

vi.mock("../../src/config/database", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

const { authenticate } = await import("../../src/middleware/auth");

const bearer = (sessionVersion = 0) =>
  createMockRequest({
    headers: {
      authorization: `Bearer ${signToken({ userId: 1, email: "test@example.com", sessionVersion })}`,
    },
  });

describe("authenticate middleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
    findUnique.mockReset();
  });

  it("rejects requests without Bearer token", async () => {
    const next = vi.fn();
    await authenticate(createMockRequest(), createMockResponse(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("accepts a valid token and loads the role from the database", async () => {
    findUnique.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      role: "ADMIN",
      sessionVersion: 0,
    });
    const req = bearer();
    const next = vi.fn();

    await authenticate(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ userId: 1, email: "test@example.com", role: "ADMIN" });
  });

  it("rejects tokens of a deleted user", async () => {
    findUnique.mockResolvedValue(null);
    const next = vi.fn();
    await authenticate(bearer(), createMockResponse(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("rejects tokens issued before a password change", async () => {
    findUnique.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      role: "USER",
      sessionVersion: 2,
    });
    const next = vi.fn();
    await authenticate(bearer(1), createMockResponse(), next);

    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("rejects invalid token", async () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer invalid-token" },
    });
    const next = vi.fn();

    await authenticate(req, createMockResponse(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
