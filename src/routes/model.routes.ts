import modelController from "../controllers/model.controller";
import { createCrudRoutes } from "../utils/crudRoutes";
import { createModelSchema, updateModelSchema } from "../validators";

export default createCrudRoutes(
  modelController,
  { create: createModelSchema, update: updateModelSchema },
  { publicRead: true }
);
