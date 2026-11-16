import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError, parseIdParam, sendError } from "../utils/errors";
import { getOwnedVehicle } from "../utils/ownership";
import {
  createDownloadUrl,
  createUploadUrl,
  deleteStoredObject,
  generateFileKey,
  statStoredObject,
  validateDocumentFile,
} from "../services/s3.service";

const documentSelect = {
  id: true,
  vehicleId: true,
  userId: true,
  name: true,
  description: true,
  mimeType: true,
  size: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

/** Documents the user can see: theirs, on a vehicle they own, fully uploaded. */
const findOwnedDocument = async (id: number, userId: number) => {
  const document = await prisma.vehicleDocument.findFirst({
    where: { id, userId, vehicle: { userId } },
  });
  if (!document) throw new AppError(404, "Documento no encontrado");
  return document;
};

class DocumentController {
  async listByVehicle(req: Request, res: Response): Promise<void> {
    try {
      const vehicleId = parseIdParam(req.params.vehicleId, "vehicleId");
      await getOwnedVehicle(vehicleId, req.user!.userId);

      const data = await prisma.vehicleDocument.findMany({
        where: { vehicleId, status: "READY" },
        select: documentSelect,
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async presign(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const vehicleId = parseIdParam(req.params.vehicleId, "vehicleId");
      await getOwnedVehicle(vehicleId, userId);

      const { name, description, mimeType, size } = req.body;
      validateDocumentFile(mimeType, size);

      const fileKey = generateFileKey(userId, vehicleId);
      const uploadUrl = await createUploadUrl(fileKey, mimeType);
      const document = await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          userId,
          name,
          description,
          fileKey,
          mimeType,
          size,
          status: "PENDING",
        },
        select: { id: true },
      });

      res.status(201).json({
        success: true,
        data: { documentId: document.id, uploadUrl },
        message: "URL de subida generada",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  /** Marks the document ready, only once the bucket holds the declared file. */
  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const vehicleId = parseIdParam(req.params.vehicleId, "vehicleId");
      const { documentId } = req.body;

      const document = await prisma.vehicleDocument.findFirst({
        where: { id: documentId, vehicleId, userId, vehicle: { userId } },
      });
      if (!document) throw new AppError(404, "Documento no encontrado");

      if (document.status !== "READY") {
        const stored = await statStoredObject(document.fileKey);
        if (!stored) {
          throw new AppError(400, "El archivo no se terminó de subir. Intenta de nuevo.");
        }
        if (stored.size !== document.size || stored.contentType !== document.mimeType) {
          await deleteStoredObject(document.fileKey);
          await prisma.vehicleDocument.delete({ where: { id: document.id } });
          throw new AppError(400, "El archivo subido no coincide con el declarado.");
        }
      }

      const data = await prisma.vehicleDocument.update({
        where: { id: document.id },
        data: { status: "READY" },
        select: documentSelect,
      });

      res.json({ success: true, data, message: "Documento confirmado" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async download(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const document = await findOwnedDocument(id, req.user!.userId);
      if (document.status !== "READY") throw new AppError(404, "Documento no encontrado");

      const extension = document.mimeType === "application/pdf"
        ? "pdf"
        : document.mimeType === "image/png"
          ? "png"
          : "jpg";
      const data = await createDownloadUrl(
        document.fileKey,
        `${document.name}.${extension}`,
        document.mimeType
      );

      res.set("Cache-Control", "no-store");
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const document = await findOwnedDocument(id, req.user!.userId);

      // Row first: a failed file deletion leaves an orphan file, never a broken document.
      await prisma.vehicleDocument.delete({ where: { id } });
      await deleteStoredObject(document.fileKey).catch((error) =>
        console.error(`No se pudo borrar el archivo del documento ${id}:`, error)
      );

      res.json({ success: true, message: "Documento eliminado" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      await findOwnedDocument(id, req.user!.userId);

      const { name, description } = req.body;
      const data = await prisma.vehicleDocument.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        },
        select: documentSelect,
      });

      res.json({ success: true, data, message: "Documento actualizado" });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new DocumentController();
