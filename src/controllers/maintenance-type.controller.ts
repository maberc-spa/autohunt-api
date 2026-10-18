import { prisma } from "../config/database";
import { createCrudController } from "../utils/crudFactory";

export default createCrudController(prisma.maintenanceType, {
  singular: "Tipo de mantenimiento",
  plural: "tipos de mantenimiento",
});
