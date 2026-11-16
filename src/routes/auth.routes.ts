import { Router } from "express";
import authController from "../controllers/auth.controller";
import { validate } from "../middleware/validate-request";
import { authenticate } from "../middleware/auth";
import { authLimiter, publicReadLimiter } from "../middleware/rate-limit";
import {
  checkUsernameParamsSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendTwoFactorSchema,
  resetPasswordSchema,
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
  publicReadLimiter,
  validate(checkUsernameParamsSchema, "params"),
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
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword.bind(authController)
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);
router.get("/me", authenticate, authController.me.bind(authController));

export default router;
