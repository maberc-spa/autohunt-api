import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const validateDocumentFile = (
  mimeType: string,
  size: number
): void => {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Tipo de archivo no permitido. Usa PDF, JPG o PNG.");
  }
  if (size <= 0 || size > MAX_FILE_SIZE_BYTES) {
    throw new Error("El archivo debe pesar entre 1 byte y 10 MB.");
  }
};

export type PresignResult = {
  documentId: number;
  fileKey: string;
  uploadUrl: string;
  downloadUrl: string;
};

export const createPresignedUpload = (
  documentId: number,
  fileKey: string
): PresignResult => {
  const baseUrl = process.env.API_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  const uploadUrl = `${baseUrl}/api/uploads/${fileKey}`;
  const downloadUrl = `${baseUrl}/api/uploads/${fileKey}`;

  return { documentId, fileKey, uploadUrl, downloadUrl };
};

export const generateFileKey = (userId: number, vehicleId: number): string =>
  `vehicles/${vehicleId}/users/${userId}/${randomUUID()}`;

export const deleteStoredObject = async (fileKey: string): Promise<void> => {
  console.info("[s3:stub] Object deletion simulated", { fileKey });
};
