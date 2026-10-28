import { Router } from "express";
import adminController from "../controllers/admin.controller";
import catalogController from "../controllers/catalog.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/require-admin";
import { validate } from "../middleware/validate-request";
import { adminUserListQuerySchema } from "../validators";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/stats", adminController.getStats.bind(adminController));
router.get(
  "/users",
  validate(adminUserListQuerySchema, "query"),
  adminController.listUsers.bind(adminController)
);
router.get("/users/:id", adminController.getUser.bind(adminController));
router.delete("/users/:id", adminController.deleteUser.bind(adminController));

// Vehicle catalog administration (review queue, ingestion runs, jobs) → auto-db-api /admin
router.use("/catalog", catalogController.adminProxy.bind(catalogController));

export default router;
