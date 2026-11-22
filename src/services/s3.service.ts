import { randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "../utils/errors";

/**
 * Document files live in an S3-compatible bucket (AWS S3, Cloudflare R2...). The app uploads and
 * downloads them directly with short-lived presigned URLs; the API never proxies the bytes.
 *
 * S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY are required; S3_REGION defaults to "auto"
 * (R2) and S3_ENDPOINT is needed for anything but AWS (R2: https://<account>.r2.cloudflarestorage.com).
 */

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const UPLOAD_URL_TTL_SECONDS = 10 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

type StorageConfig = {
  bucket: string;
  client: S3Client;
};

let cached: { key: string; config: StorageConfig } | undefined;

const readConfig = (): StorageConfig | null => {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const region = process.env.S3_REGION?.trim() || "auto";
  const key = [bucket, accessKeyId, endpoint, region].join("|");
  if (cached?.key === key) return cached.config;

  const config = {
    bucket,
    client: new S3Client({
      region,
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
  cached = { key, config };
  return config;
};

export const isStorageConfigured = (): boolean => readConfig() !== null;

const requireConfig = (): StorageConfig => {
  const config = readConfig();
  if (!config) {
    throw new AppError(503, "Los documentos no están disponibles por ahora.");
  }
  return config;
};

export const validateDocumentFile = (mimeType: string, size: number): void => {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new AppError(400, "Tipo de archivo no permitido. Usa PDF, JPG o PNG.");
  }
  if (size <= 0 || size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(400, "El archivo debe pesar entre 1 byte y 10 MB.");
  }
};

export const generateFileKey = (userId: number, vehicleId: number): string =>
  `users/${userId}/vehicles/${vehicleId}/${randomUUID()}`;

/** URL the app PUTs the file to. Content-Type is signed: it must match [mimeType]. */
export const createUploadUrl = async (fileKey: string, mimeType: string): Promise<string> => {
  const { client, bucket } = requireConfig();
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: fileKey, ContentType: mimeType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  );
};

/** Short-lived download URL. Served as an attachment so a file can never run as a web page. */
export const createDownloadUrl = async (
  fileKey: string,
  fileName: string,
  mimeType: string
): Promise<{ url: string; expiresAt: string }> => {
  const { client, bucket } = requireConfig();
  const safeName = fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "documento";
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ResponseContentType: mimeType,
      ResponseContentDisposition: `attachment; filename="${safeName}"`,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS }
  );
  return {
    url,
    expiresAt: new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
  };
};

/** What was actually uploaded, or null if nothing is there. */
export const statStoredObject = async (
  fileKey: string
): Promise<{ size: number; contentType: string | undefined } | null> => {
  const { client, bucket } = requireConfig();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: fileKey }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
};

export const deleteStoredObject = async (fileKey: string): Promise<void> => {
  const config = readConfig();
  if (!config) return;
  await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: fileKey }));
};
