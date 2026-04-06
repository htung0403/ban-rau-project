import { Request, Response } from 'express';
import { PriceSettingsService, GeneralSettingsService } from './settings.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const updatePriceSchema = z.object({
  value: z.number(),
  description: z.string().optional(),
});

const upsertRoleSalarySchema = z.object({
  role_key: z.string().min(1),
  role_name: z.string().min(1),
  daily_wage: z.number().min(0),
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

  static async getRoleSalaries(req: Request, res: Response) {
    try {
      const data = await PriceSettingsService.getRoleSalaries();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async upsertRoleSalary(req: Request, res: Response) {
    try {
      const validated = upsertRoleSalarySchema.parse(req.body);
      const data = await PriceSettingsService.upsertRoleSalary(
        validated.role_key,
        validated.role_name,
        validated.daily_wage,
        validated.description
      );
      return res.status(201).json(successResponse(data, 'Role salary updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async deleteRoleSalary(req: Request, res: Response) {
    try {
      await PriceSettingsService.deleteRoleSalary(req.params.key);
      return res.status(200).json(successResponse(null, 'Role salary deleted'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}

const upsertGeneralSettingSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
});

export class GeneralSettingsController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await GeneralSettingsService.getAll();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getByKey(req: Request, res: Response) {
    try {
      const data = await GeneralSettingsService.getByKey(req.params.key);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async upsert(req: Request, res: Response) {
    try {
      const validated = upsertGeneralSettingSchema.parse(req.body);
      const data = await GeneralSettingsService.upsert(
        req.params.key as string,
        validated.value,
        validated.description,
        req.user!.id
      );
      return res.status(200).json(successResponse(data, 'Setting updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
