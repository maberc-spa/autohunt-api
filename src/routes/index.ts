import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import countryRoutes from "./country.routes";
import brandRoutes from "./brand.routes";
import modelRoutes from "./model.routes";
import vehicleTypeRoutes from "./vehicle-type.routes";
import fuelTypeRoutes from "./fuel-type.routes";
import userRoutes from "./user.routes";
import vehicleRoutes from "./vehicle.routes";
import documentRoutes from "./document.routes";
import documentDeleteRoutes from "./document-delete.routes";
import planRoutes from "./plan.routes";
import maintenanceTypeRoutes from "./maintenance-type.routes";
import maintenanceRoutes from "./maintenance.routes";
import userMaintenanceRoutes from "./user-maintenance.routes";
import maintenanceDetailRoutes from "./maintenance-detail.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/countries", countryRoutes);
router.use("/brands", brandRoutes);
router.use("/models", modelRoutes);
router.use("/vehicle-types", vehicleTypeRoutes);
router.use("/fuel-types", fuelTypeRoutes);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/vehicles/:vehicleId/documents", documentRoutes);
router.use("/documents", documentDeleteRoutes);
router.use("/plans", planRoutes);
router.use("/maintenance-types", maintenanceTypeRoutes);
router.use("/maintenances", maintenanceRoutes);
router.use("/user-maintenances", userMaintenanceRoutes);
router.use("/maintenance-details", maintenanceDetailRoutes);

export default router;
