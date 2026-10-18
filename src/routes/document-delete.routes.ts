import { Router } from "express";
import documentController from "../controllers/document.controller";
import { authenticate } from "../middleware/auth";
import { validate, idParamSchema } from "../middleware/validate-request";
import { updateDocumentSchema } from "../validators";

const router = Router();

router.put(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateDocumentSchema),
  documentController.update.bind(documentController)
);

router.delete(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  documentController.remove.bind(documentController)
);

export default router;
