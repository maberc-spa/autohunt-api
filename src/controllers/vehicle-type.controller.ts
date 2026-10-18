import { prisma } from "../config/database";
import { createCrudController } from "../utils/crudFactory";

export default createCrudController(prisma.vehicleType, {
  singular: "Tipo de vehículo",
  plural: "tipos de vehículo",
});
