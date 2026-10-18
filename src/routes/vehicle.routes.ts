import vehicleController from "../controllers/vehicle.controller";
import { createProtectedResourceRoutes } from "../utils/crudRoutes";
import { createVehicleSchema, updateVehicleSchema } from "../validators";

export default createProtectedResourceRoutes(vehicleController, {
  create: createVehicleSchema,
  update: updateVehicleSchema,
});
