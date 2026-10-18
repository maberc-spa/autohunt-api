import { UserMaintenanceRole } from "./UserMaintenanceRole";

export default interface UserMaintenance {
  id: number;
  userId: number;
  maintenanceId: number;
  role: UserMaintenanceRole;
  createdAt: Date;
  updatedAt: Date;
}
