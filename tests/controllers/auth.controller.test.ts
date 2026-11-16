import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

const user = { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() };
const createChallenge = vi.fn();
const verifyChallengeCode = vi.fn();

vi.mock("../../src/config/database", () => ({ prisma: { user } }));
vi.mock("../../src/services/two-factor.service", () => ({
  createChallenge: (...a: unknown[]) => createChallenge(...a),
  createTwoFactorChallenge: vi.fn(),
  resendChallengeCode: vi.fn(),
  verifyChallengeCode: (...a: unknown[]) => verifyChallengeCode(...a),
  verifyTwoFactorCode: vi.fn(),
}));

const { default: auth } = await import("../../src/controllers/auth.controller");

const profile = {
  id: 3,
  username: "ana",
  firstName: "Ana",
  lastName: "Pérez",
  name: "Ana Pérez",
  email: "ana@x.cl",
  phone: null,
  password: "hash",
  countryId: null,
  emailVerified: true,
  role: "USER",
  plan: "FREE",
  planVehicleLimit: null,
  twoFactorEnabled: false,
  oauthProvider: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  sessionVersion: 1,
};

describe("AuthController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("forgot-password answers the same for unknown emails, without sending anything", async () => {
    user.findFirst.mockResolvedValue(null);
    const res = createMockResponse();
    await auth.forgotPassword(createMockRequest({ body: { email: "nadie@x.cl" } }), res);

    expect(res.statusCode).toBe(200);
    expect((res.body as { data: { challengeId: string } }).data.challengeId).toMatch(/^[0-9a-f-]{36}$/);
    expect(createChallenge).not.toHaveBeenCalled();
  });

  it("forgot-password emails a reset code to a known account", async () => {
    user.findFirst.mockResolvedValue({ id: 3, email: "ana@x.cl" });
    createChallenge.mockResolvedValue({ challengeId: "c-1" });
    const res = createMockResponse();
    await auth.forgotPassword(createMockRequest({ body: { email: "Ana@X.cl" } }), res);

    expect(createChallenge).toHaveBeenCalledWith(3, "ana@x.cl", "PASSWORD_RESET");
    expect((res.body as { data: { challengeId: string } }).data.challengeId).toBe("c-1");
  });

  it("reset-password revokes other sessions and logs in", async () => {
    verifyChallengeCode.mockResolvedValue(3);
    user.findUnique.mockResolvedValue(profile);
    const res = createMockResponse();
    await auth.resetPassword(
      createMockRequest({ body: { challengeId: "c-1", code: "123456", newPassword: "nueva-clave" } }),
      res
    );

    expect(verifyChallengeCode).toHaveBeenCalledWith("c-1", "123456", "PASSWORD_RESET");
    expect(user.update.mock.calls[0][0].data.sessionVersion).toEqual({ increment: 1 });
    const body = res.body as { data: { token: string; user: Record<string, unknown> } };
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.password).toBeUndefined();
    expect(body.data.user.sessionVersion).toBeUndefined();
  });

  it("login gives the same error for unknown users and wrong passwords", async () => {
    user.findFirst.mockResolvedValue(null);
    const res = createMockResponse();
    await auth.login(createMockRequest({ body: { identifier: "x@x.cl", password: "p" } }), res);

    expect(res.statusCode).toBe(401);
    // Emails are matched case-insensitively.
    expect(user.findFirst.mock.calls[0][0].where.email).toEqual({ equals: "x@x.cl", mode: "insensitive" });
  });
});
