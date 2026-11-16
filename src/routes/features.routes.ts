import { Router } from "express";
import { publicReadLimiter } from "../middleware/rate-limit";
import { isBillingEnabled } from "../services/billing.service";
import { isMailerConfigured } from "../services/mailer.service";
import { isStorageConfigured } from "../services/s3.service";

/** What this deployment has turned on, so the app can hide what isn't available yet. */
const router = Router();

router.get("/", publicReadLimiter, (_req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.json({
    success: true,
    data: {
      documents: isStorageConfigured(),
      planPurchases: isBillingEnabled(),
      passwordReset: isMailerConfigured() || process.env.NODE_ENV !== "production",
    },
  });
});

export default router;
