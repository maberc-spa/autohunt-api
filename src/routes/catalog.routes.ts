import { Router } from "express";
import catalogController from "../controllers/catalog.controller";
import { authenticate } from "../middleware/auth";
import {
  catalogReadLimiter,
  catalogSubmissionLimiter,
} from "../middleware/rate-limit";
import { validate } from "../middleware/validate-request";
import { catalogSubmissionSchema } from "../validators";

/**
 * Vehicle catalog (auto-db-api) behind autohunt-api. Reads are public, like
 * the other catalogs, so the app can fill the Vehicle type → Brand → Model → Year →
 * Variant dropdowns; reporting a missing car requires a session.
 */
const router = Router();

router.get(
  "/vehicle-types",
  catalogReadLimiter,
  catalogController.listVehicleTypes.bind(catalogController)
);
router.get("/brands", catalogReadLimiter, catalogController.listBrands.bind(catalogController));
router.get(
  "/brands/:brandId/models",
  catalogReadLimiter,
  catalogController.listModels.bind(catalogController)
);
router.get(
  "/models/:modelId/years",
  catalogReadLimiter,
  catalogController.listYears.bind(catalogController)
);
router.get(
  "/models/:modelId/variants",
  catalogReadLimiter,
  catalogController.listVariants.bind(catalogController)
);
router.get("/variants/:id", catalogReadLimiter, catalogController.getVariant.bind(catalogController));
router.get("/search", catalogReadLimiter, catalogController.search.bind(catalogController));
router.get("/enums", catalogReadLimiter, catalogController.listEnums.bind(catalogController));
router.post(
  "/submissions",
  authenticate,
  catalogSubmissionLimiter,
  validate(catalogSubmissionSchema),
  catalogController.createSubmission.bind(catalogController)
);

export default router;
