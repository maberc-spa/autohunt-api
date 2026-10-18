import maintenanceController from "../controllers/maintenance.controller";
import { createProtectedResourceRoutes } from "../utils/crudRoutes";
import { createMaintenanceSchema, updateMaintenanceSchema } from "../validators";

export default createProtectedResourceRoutes(maintenanceController, {
  create: createMaintenanceSchema,
  update: updateMaintenanceSchema,
});
