import { Router } from "express";
import authController from "../controllers/auth.controller";
import { validate } from "../middleware/validate-request";
import { authenticate } from "../middleware/auth";
import { authLimiter } from "../middleware/rate-limit";
import {
  loginSchema,
  registerSchema,
  resendTwoFactorSchema,
  socialLoginSchema,
  verifyTwoFactorSchema,
} from "../validators";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register.bind(authController)
);
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);
router.get(
  "/check-username/:username",
  authController.checkUsername.bind(authController)
);
router.post(
  "/verify-2fa",
  authLimiter,
  validate(verifyTwoFactorSchema),
  authController.verifyTwoFactor.bind(authController)
);
router.post(
  "/resend-2fa",
  authLimiter,
  validate(resendTwoFactorSchema),
  authController.resendTwoFactor.bind(authController)
);
router.post(
  "/social",
  authLimiter,
  validate(socialLoginSchema),
  authController.socialLogin.bind(authController)
);
router.get("/me", authenticate, authController.me.bind(authController));

export default router;
