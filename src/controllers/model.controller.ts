import { prisma } from "../config/database";
import { createCrudController } from "../utils/crudFactory";

export default createCrudController(prisma.model, {
  singular: "Modelo",
  plural: "modelos",
});
