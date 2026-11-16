import { describe, it, expect, vi } from "vitest";
import { AppError } from "../../src/utils/errors";
import { requireAdmin } from "../../src/middleware/require-admin";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

describe("requireAdmin middleware", () => {
  it("rejects unauthenticated requests with 401", () => {
    const next = vi.fn();
    requireAdmin(createMockRequest(), createMockResponse(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("rejects non-admin users with 403", () => {
    const next = vi.fn();
    requireAdmin(
      createMockRequest({ user: { userId: 1, email: "u@example.com", role: "USER" } }),
      createMockResponse(),
      next
    );

    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it("lets admins through", () => {
    const next = vi.fn();
    requireAdmin(
      createMockRequest({ user: { userId: 2, email: "a@example.com", role: "ADMIN" } }),
      createMockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith();
  });
});
