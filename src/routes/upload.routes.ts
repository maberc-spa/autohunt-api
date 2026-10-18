import { Router, Request, Response } from "express";
import { AppError, sendError } from "../utils/errors";

const uploads = new Map<string, { data: Buffer; mimeType: string }>();

const router = Router();

router.put("/:fileKey(*)", (req: Request, res: Response) => {
  try {
    const fileKey = req.params.fileKey;
    if (!fileKey) {
      throw new AppError(400, "fileKey requerido");
    }

    const data = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    const mimeType = req.headers["content-type"] ?? "application/octet-stream";

    uploads.set(fileKey, { data, mimeType: String(mimeType) });
    res.status(200).json({ success: true, message: "Archivo subido" });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/:fileKey(*)", (req: Request, res: Response) => {
  try {
    const fileKey = req.params.fileKey;
    const file = uploads.get(fileKey);
    if (!file) {
      throw new AppError(404, "Archivo no encontrado");
    }
    res.setHeader("Content-Type", file.mimeType);
    res.send(file.data);
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
