import { prisma } from "../config/database";
import { createCrudController } from "../utils/crudFactory";

export default createCrudController(prisma.country, {
  singular: "País",
  plural: "países",
});
