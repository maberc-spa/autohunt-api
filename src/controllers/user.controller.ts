import { Request, Response } from "express";
import { prisma } from "../config/database";
import { sendError } from "../utils/errors";
import { hashPassword } from "../utils/password";

const userSelect = {
  id: true,
  name: true,
  email: true,
  countryId: true,
  createdAt: true,
  updatedAt: true,
};

class UserController {
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: userSelect,
      });

      if (!user) {
        res.status(404).json({ success: false, message: "Usuario no encontrado" });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error) {
      sendError(res, error);
    }
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    try {
      const { password, ...rest } = req.body;
      const data = await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          ...rest,
          ...(password ? { password: await hashPassword(password) } : {}),
        },
        select: userSelect,
      });

      res.json({
        success: true,
        data,
        message: "Perfil actualizado exitosamente",
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
