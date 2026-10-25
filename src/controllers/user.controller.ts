import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError, sendError } from "../utils/errors";
import { comparePassword, hashPassword } from "../utils/password";
import { formatUserProfile, userProfileSelect } from "../utils/user-profile";

class UserController {
  async getMe(req: Request, res: Response): Promise<void> {
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

  async updateMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        username,
        email,
        currentPassword,
        firstName,
        lastName,
        phone,
        countryId,
      } = req.body;

      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!current) {
        throw new AppError(404, "Usuario no encontrado");
      }

      const emailChanged = email !== undefined && email !== current.email;
      const usernameChanged =
        username !== undefined && username !== current.username;

      // The email is the login identifier and the 2FA channel, so changing it
      // requires the current password (social-only accounts have none).
      if (emailChanged && current.password) {
        if (
          !currentPassword ||
          !(await comparePassword(currentPassword, current.password))
        ) {
          throw new AppError(400, "La contraseña actual es incorrecta");
        }
      }

      if (emailChanged && (await prisma.user.findUnique({ where: { email } }))) {
        throw new AppError(409, "Ese correo ya está en uso");
      }

      if (
        usernameChanged &&
        (await prisma.user.findUnique({ where: { username } }))
      ) {
        throw new AppError(409, "Ese nombre de usuario ya está en uso");
      }

      const nextFirstName = firstName ?? current.firstName;
      const nextLastName = lastName ?? current.lastName;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: nextFirstName,
          lastName: nextLastName,
          name: `${nextFirstName} ${nextLastName}`.trim(),
          ...(usernameChanged ? { username } : {}),
          ...(emailChanged ? { email } : {}),
          ...(phone !== undefined ? { phone: phone || null } : {}),
          ...(countryId !== undefined ? { countryId } : {}),
        },
        select: userProfileSelect,
      });

      res.json({
        success: true,
        data: formatUserProfile(user),
        message: "Perfil actualizado exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        throw new AppError(404, "Usuario no encontrado");
      }

      // Social-login accounts may not have a password yet; they can set one directly.
      if (user.password) {
        if (!currentPassword || !(await comparePassword(currentPassword, user.password))) {
          throw new AppError(400, "La contraseña actual es incorrecta");
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { password: await hashPassword(newPassword) },
      });

      res.json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async deleteMe(req: Request, res: Response): Promise<void> {
    try {
      await prisma.user.delete({ where: { id: req.user!.userId } });

      res.json({
        success: true,
        message: "Cuenta eliminada exitosamente",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new UserController();
