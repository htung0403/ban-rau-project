import { Request, Response } from 'express';
import { ImportOrderService } from './import-orders.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const importOrderItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  package_type: z.string().optional().nullable(),
  item_note: z.string().optional().nullable(),
  weight_kg: z.number().optional().nullable(),
  quantity: z.number().int().positive(),
  unit_price: z.number().optional().nullable(),
  image_url: z.string().optional().nullable(),
  payment_status: z.enum(['paid', 'unpaid']).default('unpaid'),
});

const importOrderSchema = z.object({
  order_date: z.string().optional(),
  order_time: z.string().optional(),
  sender_name: z.string().optional(),
  sender_id: z.string().uuid().optional().nullable(),
  receiver_name: z.string().optional(),
  receiver_phone: z.string().optional(),
  receiver_address: z.string().optional(),
  warehouse_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  order_category: z.enum(['standard', 'vegetable']).optional().default('standard'),
  total_amount: z.number().optional().nullable(),
  is_custom_amount: z.boolean().optional(),
  license_plate: z.string().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  sheet_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  payment_status: z.enum(['paid', 'unpaid']).default('unpaid'),
  items: z.array(importOrderItemSchema),
});

export class ImportOrderController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await ImportOrderService.getAll(req.query, req.user ?? undefined);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const data = await ImportOrderService.getById(req.params.id as string, req.user ?? undefined);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validated = importOrderSchema.parse(req.body);
      const data = await ImportOrderService.create(validated, req.user!.id);
      return res.status(201).json(successResponse(data, 'Đã tạo đơn nhập hàng'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const validated = importOrderSchema.partial().parse(req.body);
      const data = await ImportOrderService.update(req.params.id as string, validated);
      return res.status(200).json(successResponse(data, 'Đã cập nhật đơn nhập hàng'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await ImportOrderService.delete(req.params.id as string);
      return res.status(200).json(successResponse(null, 'Import order deleted'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getNextSequence(req: Request, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const nextCode = await ImportOrderService.generateOrderCode(date, false);
      return res.status(200).json(successResponse({ next_code: nextCode }));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
