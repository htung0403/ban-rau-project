import { Request, Response } from 'express';
import { WarehouseService } from './warehouse.service';
import { InventoryService } from '../inventory/inventory.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const warehouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  manager_id: z.string().uuid().optional(),
});

export class WarehouseController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await WarehouseService.getAll();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const data = await WarehouseService.getById(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validated = warehouseSchema.parse(req.body);
      const data = await WarehouseService.create(validated);
      return res.status(201).json(successResponse(data, 'Warehouse created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const validated = warehouseSchema.partial().parse(req.body);
      const data = await WarehouseService.update(req.params.id as string, validated);
      return res.status(200).json(successResponse(data, 'Warehouse updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
  
  static async getInventory(req: Request, res: Response) {
    try {
      const data = await InventoryService.getWarehouseInventory(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
