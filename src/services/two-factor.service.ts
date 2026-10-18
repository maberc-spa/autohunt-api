import { randomInt } from "crypto";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";
import { sendEmail } from "./mailer.service";

const CODE_LENGTH = 6;
const EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

const generateCode = (): string =>
  randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");

export const createTwoFactorChallenge = async (
  userId: number,
  email: string
): Promise<{ challengeId: string }> => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  const challenge = await prisma.twoFactorChallenge.create({
    data: { userId, code, expiresAt },
  });

  await sendEmail({
    to: email,
    subject: "Tu código de verificación AutoHunt",
    body: `Tu código es: ${code}. Expira en ${EXPIRY_MINUTES} minutos.`,
  });

  return { challengeId: challenge.id };
};

export const verifyTwoFactorCode = async (
  challengeId: string,
  code: string
): Promise<number> => {
  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || challenge.consumedAt) {
    throw new AppError(400, "Código inválido o expirado");
  }

  if (challenge.expiresAt < new Date()) {
    throw new AppError(400, "El código ha expirado");
  }

  if (challenge.code !== code) {
    throw new AppError(401, "Código incorrecto");
  }

  await prisma.twoFactorChallenge.update({
    where: { id: challengeId },
    data: { consumedAt: new Date() },
  });

  return challenge.userId;
};

export const resendTwoFactorCode = async (
  challengeId: string
): Promise<{ challengeId: string }> => {
  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: challengeId },
    include: { user: true },
  });

  if (!challenge || challenge.consumedAt) {
    throw new AppError(400, "Desafío inválido");
  }

  const secondsSinceCreated =
    (Date.now() - challenge.createdAt.getTime()) / 1000;
  if (secondsSinceCreated < RESEND_COOLDOWN_SECONDS) {
    throw new AppError(
      429,
      `Espera ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreated)} segundos para reenviar`
    );
  }

  await prisma.twoFactorChallenge.update({
    where: { id: challengeId },
    data: { consumedAt: new Date() },
  });

  return createTwoFactorChallenge(challenge.userId, challenge.user.email);
};
