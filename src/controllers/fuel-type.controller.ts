import { prisma } from "../config/database";
import { createCrudController } from "../utils/crudFactory";

export default createCrudController(prisma.fuelType, {
  singular: "Tipo de combustible",
  plural: "tipos de combustible",
});
