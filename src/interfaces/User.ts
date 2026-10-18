export default interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  countryId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
