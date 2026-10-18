import { prisma } from "../config/database";
import { createCrudController } from "../utils/crudFactory";

export default createCrudController(prisma.brand, {
  singular: "Marca",
  plural: "marcas",
});
