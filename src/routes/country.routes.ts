import countryController from "../controllers/country.controller";
import { createCrudRoutes } from "../utils/crudRoutes";
import { createCountrySchema, updateCountrySchema } from "../validators";

export default createCrudRoutes(
  countryController,
  { create: createCountrySchema, update: updateCountrySchema },
  { publicRead: true }
);
