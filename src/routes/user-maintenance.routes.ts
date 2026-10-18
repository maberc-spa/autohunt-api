import userMaintenanceController from "../controllers/user-maintenance.controller";
import { createProtectedResourceRoutes } from "../utils/crudRoutes";
import { createUserMaintenanceSchema, updateUserMaintenanceSchema } from "../validators";

export default createProtectedResourceRoutes(userMaintenanceController, {
  create: createUserMaintenanceSchema,
  update: updateUserMaintenanceSchema,
});
