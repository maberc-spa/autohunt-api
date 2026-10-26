import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppError } from "../../src/utils/errors";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

const findUnique = vi.fn();

vi.mock("../../src/config/database", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

const { requireAdmin } = await import("../../src/middleware/require-admin");

describe("requireAdmin middleware", () => {
  beforeEach(() => findUnique.mockReset());

  it("rejects unauthenticated requests with 401", async () => {
    const next = vi.fn();
    await requireAdmin(createMockRequest(), createMockResponse(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects non-admin users with 403", async () => {
    findUnique.mockResolvedValue({ role: "USER" });
    const next = vi.fn();
    await requireAdmin(
      createMockRequest({ user: { userId: 1, email: "u@example.com" } }),
      createMockResponse(),
      next
    );

    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it("rejects deleted users with 403", async () => {
    findUnique.mockResolvedValue(null);
    const next = vi.fn();
    await requireAdmin(
      createMockRequest({ user: { userId: 99, email: "gone@example.com" } }),
      createMockResponse(),
      next
    );

    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it("lets admins through", async () => {
    findUnique.mockResolvedValue({ role: "ADMIN" });
    const next = vi.fn();
    await requireAdmin(
      createMockRequest({ user: { userId: 2, email: "a@example.com" } }),
      createMockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith();
  });
});
