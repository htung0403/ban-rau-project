import { Request, Response } from 'express';
import { CustomerService } from './customers.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  user_id: z.string().uuid().optional(),
});

const debtPaymentSchema = z.object({
  amount: z.number().positive(),
  payment_date: z.string().optional(),
  notes: z.string().optional(),
});

const createAccountSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  customer_id: z.string().uuid(),
});

export class CustomerController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await CustomerService.getAll();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const data = await CustomerService.getById(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getOrders(req: Request, res: Response) {
    try {
      const data = await CustomerService.getOrders(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getExportOrders(req: Request, res: Response) {
    try {
      const data = await CustomerService.getExportOrders(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getReceipts(req: Request, res: Response) {
    try {
      const data = await CustomerService.getReceipts(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getDebt(req: Request, res: Response) {
    try {
      const data = await CustomerService.getById(req.params.id as string);
      return res.status(200).json(successResponse({ debt: data.debt }));
    } catch (err: any) {
       return res.status(400).json(errorResponse(err.message));
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validated = createCustomerSchema.parse(req.body);
      const data = await CustomerService.create(validated);
      return res.status(201).json(successResponse(data, 'Customer created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updatePayment(req: Request, res: Response) {
    try {
      const validated = debtPaymentSchema.parse(req.body);
      const userId = req.user?.id; // Assuming authentication middleware attaches user
      await CustomerService.updateDebtPayment(req.params.id as string, validated as any, userId);
      return res.status(200).json(successResponse(null, 'Payment recorded'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async createAccount(req: Request, res: Response) {
    try {
      const validated = createAccountSchema.parse(req.body);
      const data = await CustomerService.createCustomerAccount(
        validated.email,
        validated.full_name,
        validated.customer_id
      );
      return res.status(201).json(successResponse(data, 'Account created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
