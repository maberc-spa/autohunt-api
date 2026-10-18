import maintenanceTypeController from "../controllers/maintenance-type.controller";
import { createCrudRoutes } from "../utils/crudRoutes";
import { createMaintenanceTypeSchema, updateMaintenanceTypeSchema } from "../validators";

export default createCrudRoutes(
  maintenanceTypeController,
  { create: createMaintenanceTypeSchema, update: updateMaintenanceTypeSchema },
  { publicRead: true }
);
