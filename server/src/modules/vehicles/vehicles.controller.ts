import { Request, Response } from 'express';
import { VehicleService } from './vehicles.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const createVehicleSchema = z.object({
  license_plate: z.string().min(1),
  vehicle_type: z.string().optional(),
  load_capacity_ton: z.number().positive().optional(),
  goods_categories: z.array(z.enum(['grocery', 'vegetable'])).min(1).optional(),
  driver_id: z.string().uuid().optional(),
  in_charge_id: z.string().uuid().optional(),
});

const checkinSchema = z.object({
  checkin_type: z.enum(['in', 'out']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address_snapshot: z.string().optional(),
});


export class VehicleController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await VehicleService.getAll();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validated = createVehicleSchema.parse(req.body);
      const data = await VehicleService.create(validated);
      return res.status(201).json(successResponse(data, 'Vehicle added'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const validated = createVehicleSchema.partial().parse(req.body);
      const data = await VehicleService.update(req.params.id as string, validated);
      return res.status(200).json(successResponse(data, 'Vehicle updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async checkin(req: Request, res: Response) {
    try {
      const validated = checkinSchema.parse(req.body);
      const data = await VehicleService.checkin(req.params.id as string, req.user!.id, validated);
      return res.status(201).json(successResponse(data, 'Checkin recorded'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getCheckins(req: Request, res: Response) {
    try {
      const data = await VehicleService.getCheckins(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }


  static async getAssignments(req: Request, res: Response) {
    try {
      const data = await VehicleService.getAssignments(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
