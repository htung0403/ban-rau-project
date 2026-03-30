import { Request, Response } from 'express';
import { PayrollService } from './payroll.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const generatePayrollSchema = z.object({
  week_start: z.string(), // e.g. '2024-03-18' (Monday)
});

export class PayrollController {
  static async generate(req: Request, res: Response) {
    try {
      const validated = generatePayrollSchema.parse(req.body);
      const data = await PayrollService.generateWeekly(validated.week_start, req.user!.id);
      return res.status(201).json(successResponse(data, 'Payroll generated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const data = await PayrollService.getAll();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const data = await PayrollService.getById(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async confirm(req: Request, res: Response) {
    try {
      const data = await PayrollService.confirm(req.params.id as string);
      return res.status(200).json(successResponse(data, 'Payroll confirmed'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
