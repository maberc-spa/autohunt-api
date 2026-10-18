export default interface Vehicle {
  id: number;
  userId: number;
  brandId: number;
  modelId: number;
  vehicleTypeId: number;
  year: number;
  vin: string | null;
  licensePlate: string | null;
  mileage: number;
  createdAt: Date;
  updatedAt: Date;
}
