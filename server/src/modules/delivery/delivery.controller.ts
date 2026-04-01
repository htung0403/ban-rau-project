import { Request, Response } from 'express';
import { DeliveryService } from './delivery.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const deliveryOrderSchema = z.object({
  import_order_id: z.string().uuid(),
  product_name: z.string().min(1),
  total_quantity: z.number().int().positive(),
  unit_price: z.number().optional(),
  import_cost: z.number().optional(),
  delivery_date: z.string().optional(),
  vehicles: z.array(z.object({
    vehicle_id: z.string().uuid(),
    driver_id: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).optional(),
});

const assignVehicleSchema = z.array(z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  quantity: z.number().int().positive(),
}));

export class DeliveryController {
  static async getAllToday(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const data = await DeliveryService.getAllToday(startDate, endDate);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validated = deliveryOrderSchema.parse(req.body);
      const data = await DeliveryService.create(validated);
      return res.status(201).json(successResponse(data, 'Delivery order created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async assignVehicle(req: Request, res: Response) {
    try {
      const singleSchema = z.object({
        vehicle_id: z.string().uuid(),
        driver_id: z.string().uuid(),
        assigned_quantity: z.number().positive().optional(),
        quantity: z.number().positive().optional(),
      });

      const body = req.body;
      let assignments: any[] = [];

      if (Array.isArray(body)) {
        assignments = z.array(singleSchema).parse(body);
      } else {
        assignments = [singleSchema.parse(body)];
      }

      // Normalize fields for service (use quantity)
      const normalized = assignments.map(a => ({
        vehicle_id: a.vehicle_id,
        driver_id: a.driver_id,
        quantity: a.quantity || a.assigned_quantity,
      }));

      const data = await DeliveryService.assignVehicles(req.params.id as string, normalized);
      return res.status(200).json(successResponse(data, 'Vehicles assigned'));
    } catch (err: any) {
      console.error('Assign vehicle error:', err);
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updateQty(req: Request, res: Response) {
    try {
      const { delivered_quantity } = z.object({ delivered_quantity: z.number() }).parse(req.body);
      const data = await DeliveryService.updateQuantity(req.params.id as string, delivered_quantity);
      return res.status(200).json(successResponse(data, 'Delivery quantity updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getInventory(req: Request, res: Response) {
    try {
      const data = await DeliveryService.getInventory();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
