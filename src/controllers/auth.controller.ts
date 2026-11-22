import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError, sendError } from "../utils/errors";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { emailEquals, normalizeEmail } from "../utils/email";
import { formatUserProfile, userProfileSelect } from "../utils/user-profile";
import {
  createChallenge,
  createTwoFactorChallenge,
  resendChallengeCode,
  verifyChallengeCode,
  verifyTwoFactorCode,
} from "../services/two-factor.service";

/** Same cost as a real check, so a missing account can't be told apart by timing. */
const DUMMY_HASH = "$2b$10$370xe4I4g34z2hRTkvxn6.i6d6TBVV472UEQACrlmH8upum6Q9a5y";

/** Logs the user in: the profile plus a token for their current session version. */
const sessionFor = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...userProfileSelect, sessionVersion: true },
  });
  if (!user) throw new AppError(404, "Usuario no encontrado");

  const { sessionVersion, ...profile } = user;
  return {
    user: formatUserProfile(profile),
    token: signToken({ userId: user.id, email: user.email, sessionVersion }),
  };
};

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { password, firstName, lastName, username, countryId } = req.body;
      const email = normalizeEmail(req.body.email);

      if (await prisma.user.findFirst({ where: { email: emailEquals(email) } })) {
        throw new AppError(409, "Ya existe una cuenta con ese correo");
      }
      if (await prisma.user.findUnique({ where: { username } })) {
        throw new AppError(409, "Ese nombre de usuario ya está en uso");
      }

      const user = await prisma.user.create({
        data: {
          email,
          username,
          firstName,
          lastName,
          countryId,
          name: `${firstName} ${lastName}`.trim(),
          emailVerified: true,
          password: await hashPassword(password),
        },
        select: { id: true },
      });

      res.status(201).json({
        success: true,
        data: await sessionFor(user.id),
        message: "Usuario registrado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const identifier = String(req.body.identifier).trim();
      const { password } = req.body;
      const user = await prisma.user.findFirst({
        where: identifier.includes("@")
          ? { email: emailEquals(identifier) }
          : { username: identifier },
      });

      const passwordOk = await comparePassword(password, user?.password ?? DUMMY_HASH);
      if (!user || !user.password || !passwordOk) {
        throw new AppError(401, "Correo, usuario o contraseña incorrectos");
      }

      if (!user.emailVerified) {
        throw new AppError(403, "Cuenta no verificada. Revisa tu correo.");
      }

      if (user.twoFactorEnabled) {
        const { challengeId } = await createTwoFactorChallenge(user.id, user.email);
        res.json({
          success: true,
          data: { requiresTwoFactor: true, challengeId, email: user.email },
          message: "Código de verificación enviado",
        });
        return;
      }

      res.json({
        success: true,
        data: await sessionFor(user.id),
        message: "Inicio de sesión exitoso",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async checkUsername(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const existing = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      res.json({ success: true, data: { available: !existing } });
    } catch (error) {
      sendError(res, error);
    }
  }

  async verifyTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId, code } = req.body;
      const userId = await verifyTwoFactorCode(challengeId, code);
      res.json({
        success: true,
        data: await sessionFor(userId),
        message: "Verificación exitosa",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async resendTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const result = await resendChallengeCode(req.body.challengeId);
      res.json({ success: true, data: result, message: "Código reenviado" });
    } catch (error) {
      sendError(res, error);
    }
  }

  /**
   * Always answers the same way, with a challenge id, whether or not the email has an
   * account: the response never reveals who is registered.
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findFirst({
        where: { email: emailEquals(req.body.email) },
        select: { id: true, email: true },
      });

      const { challengeId } = user
        ? await createChallenge(user.id, user.email, "PASSWORD_RESET")
        : { challengeId: randomUUID() };

      res.json({
        success: true,
        data: { challengeId },
        message: "Si el correo está registrado, te enviamos un código",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  /** Sets the new password, signs every other device out and logs this one in. */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId, code, newPassword } = req.body;
      const userId = await verifyChallengeCode(challengeId, code, "PASSWORD_RESET");

      await prisma.user.update({
        where: { id: userId },
        data: {
          password: await hashPassword(newPassword),
          sessionVersion: { increment: 1 },
        },
      });

      res.json({
        success: true,
        data: await sessionFor(userId),
        message: "Contraseña actualizada",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: userProfileSelect,
      });

      if (!user) {
        throw new AppError(404, "Usuario no encontrado");
      }

      res.json({ success: true, data: formatUserProfile(user) });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export { sessionFor };
export default new AuthController();
