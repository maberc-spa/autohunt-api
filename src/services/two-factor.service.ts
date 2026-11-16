import { createHash, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { ChallengePurpose } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";
import { codeEmail, sendEmail } from "./mailer.service";

/**
 * One-time codes sent by email: the login second factor and password resets.
 * Codes are stored hashed and a challenge is burned after MAX_ATTEMPTS wrong guesses.
 */
export const CODE_LENGTH = 6;
export const EXPIRY_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_ATTEMPTS = 5;

const generateCode = (): string =>
  randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");

/** Salted with the challenge id, so equal codes never share a hash. */
export const hashCode = (challengeId: string, code: string): string =>
  createHash("sha256").update(`${challengeId}:${code}`).digest("hex");

const sameHash = (a: string, b: string): boolean =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const EMAIL_COPY: Record<ChallengePurpose, { subject: string; heading: string; intro: string }> = {
  LOGIN: {
    subject: "Tu código para entrar a AutoHunt",
    heading: "Tu código de verificación",
    intro: "Ingresa este código en la app para terminar de iniciar sesión.",
  },
  PASSWORD_RESET: {
    subject: "Restablece tu contraseña de AutoHunt",
    heading: "Restablece tu contraseña",
    intro: "Ingresa este código en la app para elegir una contraseña nueva.",
  },
};

export const createChallenge = async (
  userId: number,
  email: string,
  purpose: ChallengePurpose = "LOGIN"
): Promise<{ challengeId: string }> => {
  const id = randomUUID();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  // Only one live challenge per user and purpose.
  await prisma.twoFactorChallenge.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.twoFactorChallenge.create({
    data: { id, userId, purpose, code: hashCode(id, code), expiresAt },
  });

  const copy = EMAIL_COPY[purpose];
  await sendEmail({
    to: email,
    subject: copy.subject,
    ...codeEmail({ heading: copy.heading, intro: copy.intro, code, expiryMinutes: EXPIRY_MINUTES }),
  });

  return { challengeId: id };
};

/** Kept for the login flow's existing callers. */
export const createTwoFactorChallenge = (userId: number, email: string) =>
  createChallenge(userId, email, "LOGIN");

/** Checks [code] and consumes the challenge. Returns its user id. */
export const verifyChallengeCode = async (
  challengeId: string,
  code: string,
  purpose: ChallengePurpose = "LOGIN"
): Promise<number> => {
  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || challenge.purpose !== purpose || challenge.consumedAt) {
    throw new AppError(400, "El código ya no es válido. Pide uno nuevo.");
  }

  if (challenge.expiresAt < new Date()) {
    throw new AppError(400, "El código expiró. Pide uno nuevo.");
  }

  if (!sameHash(challenge.code, hashCode(challengeId, code))) {
    const attempts = challenge.attempts + 1;
    await prisma.twoFactorChallenge.update({
      where: { id: challengeId },
      data: { attempts, ...(attempts >= MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) },
    });
    const left = MAX_ATTEMPTS - attempts;
    throw new AppError(
      401,
      left > 0
        ? `Código incorrecto. Te quedan ${left} intento(s).`
        : "Demasiados intentos. Pide un código nuevo."
    );
  }

  // Conditional update: two concurrent correct guesses can't both succeed.
  const consumed = await prisma.twoFactorChallenge.updateMany({
    where: { id: challengeId, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) {
    throw new AppError(400, "El código ya no es válido. Pide uno nuevo.");
  }

  return challenge.userId;
};

export const verifyTwoFactorCode = (challengeId: string, code: string) =>
  verifyChallengeCode(challengeId, code, "LOGIN");

/** Sends a fresh code for the same purpose; the old challenge stops working. */
export const resendChallengeCode = async (
  challengeId: string
): Promise<{ challengeId: string }> => {
  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { select: { email: true } } },
  });

  // An unknown id gets a decoy, like forgot-password does for unknown emails, so neither
  // endpoint reveals which accounts exist.
  if (!challenge) return { challengeId: randomUUID() };

  if (challenge.consumedAt) {
    throw new AppError(400, "La solicitud expiró. Vuelve a empezar.");
  }

  const secondsSinceCreated = (Date.now() - challenge.createdAt.getTime()) / 1000;
  if (secondsSinceCreated < RESEND_COOLDOWN_SECONDS) {
    throw new AppError(
      429,
      `Espera ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreated)} segundos para reenviar`
    );
  }

  return createChallenge(challenge.userId, challenge.user.email, challenge.purpose);
};

export const resendTwoFactorCode = resendChallengeCode;
