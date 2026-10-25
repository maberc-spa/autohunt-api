import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError, sendError } from "../utils/errors";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { formatUserProfile, userProfileSelect } from "../utils/user-profile";
import {
  createTwoFactorChallenge,
  resendTwoFactorCode,
  verifyTwoFactorCode,
} from "../services/two-factor.service";
import {
  findOrCreateSocialUser,
  verifySocialToken,
} from "../services/oauth.service";

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { password, firstName, lastName, username, ...rest } = req.body;
      const name = `${firstName} ${lastName}`.trim();

      const user = await prisma.user.create({
        data: {
          ...rest,
          username,
          firstName,
          lastName,
          name,
          emailVerified: true,
          password: await hashPassword(password),
        },
        select: userProfileSelect,
      });

      const token = signToken({ userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        data: { user: formatUserProfile(user), token },
        message: "Usuario registrado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body;
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
      });

      if (!user || !user.password) {
        throw new AppError(401, "Credenciales inválidas");
      }

      if (!(await comparePassword(password, user.password))) {
        throw new AppError(401, "Credenciales inválidas");
      }

      if (!user.emailVerified) {
        throw new AppError(403, "Cuenta no verificada. Revisa tu correo.");
      }

      if (user.twoFactorEnabled) {
        const { challengeId } = await createTwoFactorChallenge(
          user.id,
          user.email
        );
        res.json({
          success: true,
          data: {
            requiresTwoFactor: true,
            challengeId,
            email: user.email,
          },
          message: "Código de verificación enviado",
        });
        return;
      }

      const token = signToken({ userId: user.id, email: user.email });
      const selected = await prisma.user.findUnique({
        where: { id: user.id },
        select: userProfileSelect,
      });

      res.json({
        success: true,
        data: {
          user: formatUserProfile(selected!),
          token,
        },
        message: "Inicio de sesión exitoso",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async checkUsername(req: Request, res: Response): Promise<void> {
    try {
      const username = req.params.username?.trim();
      if (!username) {
        throw new AppError(400, "Username requerido");
      }

      const existing = await prisma.user.findUnique({ where: { username } });
      res.json({
        success: true,
        data: { available: !existing },
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async verifyTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId, code } = req.body;
      const userId = await verifyTwoFactorCode(challengeId, code);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userProfileSelect,
      });

      if (!user) {
        throw new AppError(404, "Usuario no encontrado");
      }

      const token = signToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        data: { user: formatUserProfile(user), token },
        message: "Verificación exitosa",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async resendTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId } = req.body;
      const result = await resendTwoFactorCode(challengeId);
      res.json({
        success: true,
        data: result,
        message: "Código reenviado",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async socialLogin(req: Request, res: Response): Promise<void> {
    try {
      const { provider, idToken, email, firstName, lastName, username } =
        req.body;
      const profile = await verifySocialToken(provider, idToken, {
        provider,
        providerId: idToken,
        email,
        firstName,
        lastName,
        username,
      });
      const user = await findOrCreateSocialUser(profile);
      const selected = await prisma.user.findUnique({
        where: { id: user.id },
        select: userProfileSelect,
      });

      const token = signToken({
        userId: selected!.id,
        email: selected!.email,
      });

      res.json({
        success: true,
        data: { user: formatUserProfile(selected!), token },
        message: "Inicio de sesión social exitoso",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

export default new AuthController();
