import { prisma } from "../config/database";
import { deleteStoredObject } from "./s3.service";

export type DeletedUserSummary = {
  vehicles: number;
  maintenances: number;
  documents: number;
};

/**
 * Deletes a user and everything that belongs to them.
 *
 * Database rows (vehicles, maintenances, documents, 2FA challenges...) go away
 * through the schema's ON DELETE CASCADE; stored document files are removed
 * explicitly since the database cannot reach them.
 */
export const deleteUserWithData = async (
  userId: number
): Promise<DeletedUserSummary> => {
  const [documents, vehicles, maintenances] = await Promise.all([
    prisma.vehicleDocument.findMany({
      where: { userId },
      select: { fileKey: true },
    }),
    prisma.vehicle.count({ where: { userId } }),
    prisma.maintenance.count({ where: { vehicle: { userId } } }),
  ]);

  await prisma.user.delete({ where: { id: userId } });

  // After the rows are gone: a failed file deletion leaves an orphan file,
  // never a document pointing to a missing file.
  const results = await Promise.allSettled(
    documents.map((document) => deleteStoredObject(document.fileKey))
  );
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    console.error(
      `No se pudieron borrar ${failed.length} archivo(s) del usuario ${userId}`
    );
  }

  return { vehicles, maintenances, documents: documents.length };
};
