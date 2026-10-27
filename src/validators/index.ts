import { z } from "zod";
import {
  VIN_ISSUE_MESSAGES,
  VIN_LENGTH,
  normalizeVin,
  validateVin,
} from "../utils/vin";

const optionalInt = z.coerce.number().int().positive().optional().nullable();

const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/);

export const createCountrySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(3),
});

export const updateCountrySchema = createCountrySchema.partial();

export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  logo: z.string().max(500).optional().nullable(),
  countryId: z.coerce.number().int().positive(),
});

export const updateBrandSchema = createBrandSchema.partial();

export const createModelSchema = z.object({
  name: z.string().min(1).max(100),
  brandId: z.coerce.number().int().positive(),
});

export const updateModelSchema = createModelSchema.partial();

export const createVehicleTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateVehicleTypeSchema = createVehicleTypeSchema.partial();

export const registerSchema = z.object({
  username: usernameSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  countryId: optionalInt,
});

export const loginSchema = z.object({
  identifier: z.string().min(1).max(255),
  password: z.string().min(1).max(128),
});

export const verifyTwoFactorSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().length(6).regex(/^\d+$/),
});

export const resendTwoFactorSchema = z.object({
  challengeId: z.string().uuid(),
});

export const socialLoginSchema = z.object({
  provider: z.enum(["GOOGLE", "APPLE"]),
  idToken: z.string().min(1),
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  username: z.string().min(3).max(30).optional(),
});

export const upgradePlanSchema = z.object({
  plan: z.enum([
    "FREE",
    "PREMIUM_TIER_1",
    "PREMIUM_TIER_2",
    "PREMIUM_TIER_3",
  ]),
  planVehicleLimit: z.coerce.number().int().min(50).max(200).optional(),
});

export const createFuelTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateFuelTypeSchema = createFuelTypeSchema.partial();

export const presignDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  size: z.coerce.number().int().positive().max(10 * 1024 * 1024),
});

export const confirmDocumentSchema = z.object({
  documentId: z.coerce.number().int().positive(),
});

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
});

export const createUserSchema = registerSchema;

export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  email: z.string().trim().email().optional(),
  // Required to change the email of an account that has a password.
  currentPassword: z.string().min(1).max(128).optional(),
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  phone: z
    .union([
      z.string().trim().regex(/^\+?[0-9][0-9\s-]{6,19}$/),
      z.literal(""),
    ])
    .optional()
    .nullable(),
  countryId: optionalInt,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128).optional(),
  newPassword: z.string().min(8).max(128),
});

/**
 * Normalizes before validating, so the stored VIN is always canonical.
 * [fullLength] rejects legacy (pre-1981) VINs, which can't be decoded.
 */
const vinField = (fullLength: boolean) =>
  z
    .string()
    .max(40)
    .transform(normalizeVin)
    .superRefine((vin, ctx) => {
      const issue =
        fullLength && vin.length !== VIN_LENGTH ? "length" : validateVin(vin);
      if (issue) {
        ctx.addIssue({ code: "custom", message: VIN_ISSUE_MESSAGES[issue] });
      }
    });

export const vinSchema = vinField(false);

export const vinDecodeParamsSchema = z.object({ vin: vinField(true) });

export const createVehicleSchema = z.object({
  name: z.string().min(1).max(100),
  brandId: z.coerce.number().int().positive(),
  modelId: z.coerce.number().int().positive(),
  vehicleTypeId: z.coerce.number().int().positive(),
  countryId: z.coerce.number().int().positive(),
  fuelTypeId: z.coerce.number().int().positive(),
  cylinder: z.coerce.number().positive().max(20).optional().nullable(),
  year: z.coerce.number().int().min(1886).max(2100).optional().nullable(),
  vin: vinSchema.optional().nullable(),
  licensePlate: z.string().min(1).max(20).optional().nullable(),
  mileage: z.coerce.number().int().min(0).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createMaintenanceTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateMaintenanceTypeSchema = createMaintenanceTypeSchema.partial();

export const createMaintenanceSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  performedAt: z.coerce.date(),
  mileageAtService: z.coerce.number().int().min(0).optional().nullable(),
  totalCost: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial();

export const createUserMaintenanceSchema = z.object({
  maintenanceId: z.coerce.number().int().positive(),
  role: z.enum(["OWNER", "MECHANIC", "OTHER"]).optional(),
});

export const updateUserMaintenanceSchema = z.object({
  role: z.enum(["OWNER", "MECHANIC", "OTHER"]).optional(),
});

export const createMaintenanceDetailSchema = z.object({
  maintenanceId: z.coerce.number().int().positive(),
  maintenanceTypeId: z.coerce.number().int().positive(),
  description: z.string().max(500).optional().nullable(),
  cost: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1).optional(),
});

export const updateMaintenanceDetailSchema = createMaintenanceDetailSchema.partial();

export const adminUserListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["recent", "vehicles"]).default("recent"),
});
