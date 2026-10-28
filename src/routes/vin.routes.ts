import { Router } from "express";
import vinController from "../controllers/vin.controller";
import { authenticate } from "../middleware/auth";
import { vinDecodeLimiter } from "../middleware/rate-limit";
import { validate } from "../middleware/validate-request";
import { vinDecodeParamsSchema } from "../validators";

const router = Router();

router.get(
  "/:vin",
  authenticate,
  vinDecodeLimiter,
  validate(vinDecodeParamsSchema, "params"),
  vinController.decode.bind(vinController)
);

export default router;
