import { describe, it, expect, vi, beforeEach } from "vitest";

const db = {
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
};
const sendEmail = vi.fn();

vi.mock("../../src/config/database", () => ({
  prisma: { twoFactorChallenge: db },
}));
vi.mock("../../src/services/mailer.service", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  codeEmail: () => ({ text: "t", html: "h" }),
}));

const { createChallenge, hashCode, verifyChallengeCode, resendChallengeCode, MAX_ATTEMPTS } =
  await import("../../src/services/two-factor.service");

const challenge = (overrides: Record<string, unknown> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  userId: 7,
  code: hashCode("11111111-1111-4111-8111-111111111111", "123456"),
  purpose: "LOGIN",
  attempts: 0,
  consumedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  ...overrides,
});

describe("one-time codes", () => {
  beforeEach(() => {
    Object.values(db).forEach((fn) => fn.mockReset());
    sendEmail.mockReset();
    db.updateMany.mockResolvedValue({ count: 1 });
  });

  it("stores the code hashed and emails the plain code", async () => {
    await createChallenge(7, "ana@x.cl", "PASSWORD_RESET");

    const { data } = db.create.mock.calls[0][0];
    expect(data.purpose).toBe("PASSWORD_RESET");
    expect(data.code).toMatch(/^[0-9a-f]{64}$/);
    expect(sendEmail).toHaveBeenCalledOnce();
    // Older live challenges of the same purpose are retired.
    expect(db.updateMany.mock.calls[0][0].where).toMatchObject({ userId: 7, purpose: "PASSWORD_RESET" });
  });

  it("accepts the right code once", async () => {
    db.findUnique.mockResolvedValue(challenge());
    await expect(verifyChallengeCode(challenge().id, "123456")).resolves.toBe(7);
  });

  it("rejects a code issued for another purpose", async () => {
    db.findUnique.mockResolvedValue(challenge({ purpose: "LOGIN" }));
    await expect(
      verifyChallengeCode(challenge().id, "123456", "PASSWORD_RESET")
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("counts wrong guesses and burns the challenge at the limit", async () => {
    db.findUnique.mockResolvedValue(challenge({ attempts: MAX_ATTEMPTS - 1 }));
    await expect(verifyChallengeCode(challenge().id, "000000")).rejects.toMatchObject({
      statusCode: 401,
    });
    const { data } = db.update.mock.calls[0][0];
    expect(data.attempts).toBe(MAX_ATTEMPTS);
    expect(data.consumedAt).toBeInstanceOf(Date);
  });

  it("rejects expired codes", async () => {
    db.findUnique.mockResolvedValue(challenge({ expiresAt: new Date(Date.now() - 1) }));
    await expect(verifyChallengeCode(challenge().id, "123456")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("fails if a concurrent request consumed the challenge first", async () => {
    db.findUnique.mockResolvedValue(challenge());
    db.updateMany.mockResolvedValue({ count: 0 });
    await expect(verifyChallengeCode(challenge().id, "123456")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("answers an unknown challenge with a decoy instead of an error", async () => {
    db.findUnique.mockResolvedValue(null);
    const result = await resendChallengeCode("22222222-2222-4222-8222-222222222222");
    expect(result.challengeId).toMatch(/^[0-9a-f-]{36}$/);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("enforces the resend cooldown", async () => {
    db.findUnique.mockResolvedValue({ ...challenge(), user: { email: "a@x.cl" } });
    await expect(resendChallengeCode(challenge().id)).rejects.toMatchObject({ statusCode: 429 });
  });
});
