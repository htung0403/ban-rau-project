import { Request, Response } from 'express';
import { PriceSettingsService } from './settings.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const updatePriceSchema = z.object({
  value: z.number(),
  description: z.string().optional(),
});

export class PriceSettingsController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await PriceSettingsService.getAll();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const validated = updatePriceSchema.parse(req.body);
      const data = await PriceSettingsService.update(
        req.params.key as string,
        validated.value,
        validated.description,
        req.user!.id
      );
      return res.status(200).json(successResponse(data, 'Price setting updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
