import vehicleTypeController from "../controllers/vehicle-type.controller";
import { createCrudRoutes } from "../utils/crudRoutes";
import { createVehicleTypeSchema, updateVehicleTypeSchema } from "../validators";

export default createCrudRoutes(
  vehicleTypeController,
  { create: createVehicleTypeSchema, update: updateVehicleTypeSchema },
  { publicRead: true }
);
