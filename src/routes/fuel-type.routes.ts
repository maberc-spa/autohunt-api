import fuelTypeController from "../controllers/fuel-type.controller";
import { createCrudRoutes } from "../utils/crudRoutes";
import { createFuelTypeSchema, updateFuelTypeSchema } from "../validators";

export default createCrudRoutes(
  fuelTypeController,
  { create: createFuelTypeSchema, update: updateFuelTypeSchema },
  { publicRead: true }
);
