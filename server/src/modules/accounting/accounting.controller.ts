import { Request, Response } from 'express';
import { AccountingService } from './accounting.service';
import { successResponse, errorResponse } from '../../utils/response';

export class AccountingController {
  static async getDebts(req: Request, res: Response) {
    try {
      const data = await AccountingService.getDebts();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getRevenueByDate(req: Request, res: Response) {
    try {
      const from = req.query.from as string;
      const to = req.query.to as string;
      const data = await AccountingService.getRevenueByDate(from, to);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getRevenueByVehicle(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      const data = await AccountingService.getRevenueByVehicle(date);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
