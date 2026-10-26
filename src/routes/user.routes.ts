import { Router } from "express";
import userController from "../controllers/user.controller";
import { validate } from "../middleware/validate-request";
import { authenticate } from "../middleware/auth";
import { changePasswordSchema, updateUserSchema } from "../validators";

const router = Router();

router.use(authenticate);

router.get("/me", userController.getMe.bind(userController));
router.put("/me", validate(updateUserSchema), userController.updateMe.bind(userController));
router.put(
  "/me/password",
  validate(changePasswordSchema),
  userController.changePassword.bind(userController)
);
router.delete("/me", userController.deleteMe.bind(userController));

export default router;
