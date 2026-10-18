import { Router } from "express";
import healthController from "../controllers/health.controller";
import { publicReadLimiter } from "../middleware/rate-limit";

const router = Router();

router.use(publicReadLimiter);

router.get("/", healthController.healthCheck.bind(healthController));
router.get("/ready", healthController.readinessCheck.bind(healthController));
router.get("/live", healthController.livenessCheck.bind(healthController));

export default router;
