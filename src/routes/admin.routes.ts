import { Router } from "express";
import adminController from "../controllers/admin.controller";
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

export default router;
