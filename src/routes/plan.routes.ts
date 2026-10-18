import { Router } from "express";
import planController from "../controllers/plan.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate-request";
import { upgradePlanSchema } from "../validators";

const router = Router();

router.get("/", planController.list.bind(planController));
router.post(
  "/upgrade",
  authenticate,
  validate(upgradePlanSchema),
  planController.upgrade.bind(planController)
);

export default router;
