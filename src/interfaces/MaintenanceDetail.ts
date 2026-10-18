export default interface MaintenanceDetail {
  id: number;
  maintenanceId: number;
  maintenanceTypeId: number;
  description: string | null;
  cost: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}
