import { Request, Response } from 'express';
import { ExportOrderService } from './export-orders.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const exportOrderSchema = z.object({
  export_date: z.string().min(1, 'Ngày xuất không được để trống'),
  product_id: z.string().uuid('Hàng hóa không hợp lệ'),
  warehouse_id: z.string().uuid('Kho không hợp lệ'),
  quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
  customer_id: z.string().uuid('Khách hàng không hợp lệ'),
  debt_amount: z.number().min(0, 'Công nợ không được âm').optional(),
  payment_status: z.enum(['unpaid', 'partial', 'paid']).optional(),
  paid_amount: z.number().optional(),
});

const paymentUpdateSchema = z.object({
  paid_amount: z.number(),
  status: z.enum(['unpaid', 'partial', 'paid']),
});

export class ExportOrderController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await ExportOrderService.getAll(req.query);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validated = exportOrderSchema.parse(req.body);
      const data = await ExportOrderService.create(validated, req.user!.id);
      return res.status(201).json(successResponse(data, 'Export order tracked'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updatePayment(req: Request, res: Response) {
    try {
      const validated = paymentUpdateSchema.parse(req.body);
      const data = await ExportOrderService.updatePayment(req.params.id as string, validated);
      return res.status(200).json(successResponse(data, 'Payment updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
