import maintenanceDetailController from "../controllers/maintenance-detail.controller";
import { createProtectedResourceRoutes } from "../utils/crudRoutes";
import { createMaintenanceDetailSchema, updateMaintenanceDetailSchema } from "../validators";

export default createProtectedResourceRoutes(maintenanceDetailController, {
  create: createMaintenanceDetailSchema,
  update: updateMaintenanceDetailSchema,
});
