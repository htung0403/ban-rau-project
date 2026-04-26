import { Request, Response } from 'express';
import { CustomerService } from './customers.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  customer_type: z.enum(['retail', 'wholesale', 'grocery', 'vegetable', 'grocery_sender', 'grocery_receiver', 'vegetable_sender', 'vegetable_receiver']).default('retail'),
  user_id: z.string().uuid().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  customer_type: z.enum(['retail', 'wholesale', 'grocery', 'vegetable', 'grocery_sender', 'grocery_receiver', 'vegetable_sender', 'vegetable_receiver']).optional(),
  is_loyal: z.boolean().optional(),
});

const bulkLoyalSchema = z.object({
  customer_ids: z.array(z.string().uuid()),
  is_loyal: z.boolean(),
});

const updatePricesSchema = z.object({
  updates: z.array(z.object({
    deliveryOrderId: z.string().uuid(),
    unitPrice: z.number().min(0),
  })),
});

const debtPaymentSchema = z.object({
  amount: z.number().min(0),
  payment_date: z.string().optional(),
  payment_time: z.string().optional(),
  collector_id: z.string().uuid().optional(),
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
      const type = req.query.type as string | undefined;
      let isLoyal: boolean | undefined = undefined;
      if (req.query.is_loyal !== undefined) {
        isLoyal = req.query.is_loyal === 'true';
      }
      const data = await CustomerService.getAll(type, isLoyal);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async bulkSetLoyal(req: Request, res: Response) {
    try {
      const validated = bulkLoyalSchema.parse(req.body);
      const data = await CustomerService.bulkSetLoyal(validated.customer_ids, validated.is_loyal);
      return res.status(200).json(successResponse(data, 'Customers loyalty status updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getDeliveryOrders(req: Request, res: Response) {
    try {
      const data = await CustomerService.getDeliveryOrders(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updateDeliveryOrderPrices(req: Request, res: Response) {
    try {
      const validated = updatePricesSchema.parse(req.body);
      const data = await CustomerService.updateDeliveryOrderPrices(req.params.id as string, validated.updates as { deliveryOrderId: string, unitPrice: number }[]);
      return res.status(200).json(successResponse(data, 'Delivery order prices updated'));
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

  static async getByUserId(req: Request, res: Response) {
    try {
      const data = await CustomerService.getByUserId(req.params.userId as string);
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

  static async update(req: Request, res: Response) {
    try {
      const validated = updateCustomerSchema.parse(req.body);
      const data = await CustomerService.update(req.params.id as string, validated);
      return res.status(200).json(successResponse(data, 'Customer updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await CustomerService.softDelete(req.params.id as string);
      return res.status(200).json(successResponse(null, 'Customer deleted'));
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
