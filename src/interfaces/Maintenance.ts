export default interface Maintenance {
  id: number;
  vehicleId: number;
  performedAt: Date;
  mileageAtService: number | null;
  totalCost: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
