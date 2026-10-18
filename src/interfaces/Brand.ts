export default interface Brand {
  id: number;
  name: string;
  logo: string | null;
  countryId: number;
  createdAt: Date;
  updatedAt: Date;
}
