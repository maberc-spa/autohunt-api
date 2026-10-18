import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticate } from "../../src/middleware/auth";
import { AppError } from "../../src/utils/errors";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";
import { signToken } from "../../src/utils/jwt";

describe("authenticate middleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
  });

  it("rejects requests without Bearer token", () => {
    const next = vi.fn();
    authenticate(createMockRequest(), createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("accepts valid token and sets req.user", () => {
    const token = signToken({ userId: 1, email: "test@example.com" });
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const next = vi.fn();

    authenticate(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ userId: 1, email: "test@example.com" });
  });

  it("rejects invalid token", () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer invalid-token" },
    });
    const next = vi.fn();

    authenticate(req, createMockResponse(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});
