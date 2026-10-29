import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";

/**
 * The app picks brand and model from the vehicle catalog (auto-db-api), whose ids are not ours,
 * or types them by hand when the car isn't there ("No encuentro mi auto"). A vehicle still points
 * at our own brand/model rows, so the names are resolved here: an existing row is reused
 * (ignoring case) and a missing one is created.
 */

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/** Runs `create`; if a concurrent request created the same row first, returns that one. */
const findOrCreate = async <T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>
): Promise<T> => {
  const existing = await find();
  if (existing) return existing;
  try {
    return await create();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const created = await find();
    if (!created) throw error;
    return created;
  }
};

export type VehicleRefNames = {
  brandName: string;
  modelName: string;
  /** Origin country for a brand we don't have yet; an existing brand keeps its own. */
  countryId?: number;
};

/** Our brand and model ids, plus the brand's country, which is where the vehicle comes from. */
export const resolveBrandAndModel = async ({
  brandName,
  modelName,
  countryId,
}: VehicleRefNames): Promise<{ brandId: number; modelId: number; countryId: number }> => {
  const brand = await findOrCreate(
    () =>
      prisma.brand.findFirst({
        where: { name: { equals: brandName, mode: "insensitive" } },
        orderBy: { id: "asc" },
      }),
    () => {
      if (countryId === undefined) {
        throw new AppError(400, "Indica el país de origen de la marca");
      }
      return prisma.brand.create({ data: { name: brandName, countryId } });
    }
  );
  const model = await findOrCreate(
    () =>
      prisma.model.findFirst({
        where: { brandId: brand.id, name: { equals: modelName, mode: "insensitive" } },
        orderBy: { id: "asc" },
      }),
    () => prisma.model.create({ data: { name: modelName, brandId: brand.id } })
  );
  return { brandId: brand.id, modelId: model.id, countryId: brand.countryId };
};
