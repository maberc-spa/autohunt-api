import { Request, Response } from "express";
import { sendError } from "../utils/errors";
import { vinDecoderService } from "../services/vin-decoder.service";

class VinController {
  async decode(req: Request, res: Response): Promise<void> {
    try {
      // Already normalized and validated by vinDecodeParamsSchema.
      const data = await vinDecoderService.decode(req.params.vin);
      res.json({ success: true, data });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new VinController();
