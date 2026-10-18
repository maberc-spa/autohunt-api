import { Request, Response } from "express";
import { UserPlan } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError, sendError } from "../utils/errors";
import { getPlanInfo, PLAN_CATALOG } from "../services/plan-limits";
import { purchasePlan } from "../services/billing.service";

class PlanController {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: PLAN_CATALOG });
    } catch (error) {
      sendError(res, error);
    }
  }

  async upgrade(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { plan, planVehicleLimit } = req.body as {
        plan: UserPlan;
        planVehicleLimit?: number;
      };

      if (!Object.values(UserPlan).includes(plan)) {
        throw new AppError(400, "Plan inválido");
      }

      await purchasePlan(userId, plan);

      const data: {
        plan: UserPlan;
        planVehicleLimit?: number;
      } = { plan };

      if (plan === "PREMIUM_TIER_3" && planVehicleLimit) {
        if (planVehicleLimit < 50 || planVehicleLimit > 200) {
          throw new AppError(
            400,
            "El límite del plan Nivel 3 debe estar entre 50 y 200"
          );
        }
        data.planVehicleLimit = planVehicleLimit;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          countryId: true,
          emailVerified: true,
          plan: true,
          planVehicleLimit: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: {
          user: {
            ...user,
            ...getPlanInfo(user.plan, user.planVehicleLimit),
          },
        },
        message: "Plan actualizado",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new PlanController();
