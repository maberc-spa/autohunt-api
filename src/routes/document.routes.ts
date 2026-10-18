import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate-request";
import documentController from "../controllers/document.controller";
import {
  confirmDocumentSchema,
  presignDocumentSchema,
} from "../validators";

const router = Router({ mergeParams: true });

router.get("/", authenticate, documentController.listByVehicle.bind(documentController));
router.post(
  "/presign",
  authenticate,
  validate(presignDocumentSchema),
  documentController.presign.bind(documentController)
);
router.post(
  "/confirm",
  authenticate,
  validate(confirmDocumentSchema),
  documentController.confirm.bind(documentController)
);

export default router;
