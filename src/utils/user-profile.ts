import { Prisma } from "@prisma/client";
import { getPlanInfo } from "../services/plan-limits";

export const userProfileSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  name: true,
  email: true,
  phone: true,
  password: true,
  countryId: true,
  emailVerified: true,
  plan: true,
  planVehicleLimit: true,
  twoFactorEnabled: true,
  oauthProvider: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type UserProfileRecord = Prisma.UserGetPayload<{
  select: typeof userProfileSelect;
}>;

// Never expose the password hash; clients only need to know whether one exists.
export const formatUserProfile = ({ password, ...user }: UserProfileRecord) => ({
  ...user,
  hasPassword: Boolean(password),
  ...getPlanInfo(user.plan, user.planVehicleLimit),
});
