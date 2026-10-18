import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError, parseIdParam, sendError } from "../utils/errors";
import { getOwnedVehicle } from "../utils/ownership";
import {
  createPresignedUpload,
  deleteStoredObject,
  generateFileKey,
  validateDocumentFile,
} from "../services/s3.service";

const documentSelect = {
  id: true,
  vehicleId: true,
  userId: true,
  name: true,
  description: true,
  fileKey: true,
  mimeType: true,
  size: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const buildDownloadUrl = (fileKey: string): string => {
  const baseUrl = process.env.API_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  return `${baseUrl}/api/uploads/${fileKey}`;
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

      res.json({
        success: true,
        data: data.map((doc) => ({
          ...doc,
          downloadUrl: buildDownloadUrl(doc.fileKey),
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async presign(req: Request, res: Response): Promise<void> {
    try {
      const vehicleId = parseIdParam(req.params.vehicleId, "vehicleId");
      await getOwnedVehicle(vehicleId, req.user!.userId);

      const { name, description, mimeType, size } = req.body;
      validateDocumentFile(mimeType, size);

      const fileKey = generateFileKey(req.user!.userId, vehicleId);
      const document = await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          userId: req.user!.userId,
          name,
          description,
          fileKey,
          mimeType,
          size,
          status: "PENDING",
        },
        select: documentSelect,
      });

      const presigned = createPresignedUpload(document.id, fileKey);
      res.status(201).json({
        success: true,
        data: presigned,
        message: "URL de subida generada",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const vehicleId = parseIdParam(req.params.vehicleId, "vehicleId");
      const { documentId } = req.body;

      const document = await prisma.vehicleDocument.findFirst({
        where: {
          id: documentId,
          vehicleId,
          userId: req.user!.userId,
        },
      });

      if (!document) {
        throw new AppError(404, "Documento no encontrado");
      }

      const data = await prisma.vehicleDocument.update({
        where: { id: document.id },
        data: { status: "READY" },
        select: documentSelect,
      });

      res.json({
        success: true,
        data: {
          ...data,
          downloadUrl: buildDownloadUrl(data.fileKey),
        },
        message: "Documento confirmado",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const document = await prisma.vehicleDocument.findFirst({
        where: { id, userId: req.user!.userId },
      });

      if (!document) {
        throw new AppError(404, "Documento no encontrado");
      }

      await deleteStoredObject(document.fileKey);
      await prisma.vehicleDocument.delete({ where: { id } });

      res.json({
        success: true,
        message: "Documento eliminado",
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);
      const document = await prisma.vehicleDocument.findFirst({
        where: { id, userId: req.user!.userId },
      });

      if (!document) {
        throw new AppError(404, "Documento no encontrado");
      }

      const { name, description } = req.body;
      const data = await prisma.vehicleDocument.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        },
        select: documentSelect,
      });

      res.json({
        success: true,
        data: {
          ...data,
          downloadUrl: buildDownloadUrl(data.fileKey),
        },
        message: "Documento actualizado",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new DocumentController();
