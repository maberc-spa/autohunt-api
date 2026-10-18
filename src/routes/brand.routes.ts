import brandController from "../controllers/brand.controller";
import { createCrudRoutes } from "../utils/crudRoutes";
import { createBrandSchema, updateBrandSchema } from "../validators";

export default createCrudRoutes(
  brandController,
  { create: createBrandSchema, update: updateBrandSchema },
  { publicRead: true }
);
