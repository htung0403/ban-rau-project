import { Request, Response } from 'express';
import '../../types';
import { HRService } from './hr.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const createLeaveRequestSchema = z.object({
  from_date: z.string(),
  to_date: z.string(),
  reason: z.string().optional(),
});

const reviewLeaveRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  review_note: z.string().optional(),
});

const createSalaryAdvanceSchema = z.object({
  amount: z.number().positive(),
  reason: z.string(),
  week_start: z.string().optional(),
});

const markAttendanceSchema = z.object({
  employee_id: z.string().uuid(),
  work_date: z.string(),
  is_present: z.boolean().optional(),
  check_in_time: z.string().nullable().optional(),
  note: z.string().optional(),
});

const createCompensatorySchema = z.object({
  work_date: z.string(),
  check_in_time: z.string().nullable().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

const reviewCompensatorySchema = z.object({
  status: z.enum(['approved', 'rejected'])
});

const createEmployeeSchema = z.object({
  password: z.string().min(6),
  full_name: z.string().min(2),
  phone: z.string().min(1),
  role: z.string().min(1),
});

const updateEmployeeSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().nullable().optional(),
  role: z.string().min(1),
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  citizen_id: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  personal_email: z.string().email().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  emergency_contact_relationship: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  ward: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  temporary_address: z.string().nullable().optional(),
});

const expenseDateTimeString = z
  .string()
  .min(8)
  .refine((val) => !Number.isNaN(Date.parse(val)), 'Ngày giờ chi không hợp lệ');

const createExpenseSchema = z.object({
  employee_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable().optional(),
  expense_name: z.string().min(1, 'Tên chi phí không được để trống').max(255),
  amount: z.number().min(0).max(999999999),
  expense_date: expenseDateTimeString,
  image_urls: z.array(z.string().url()).optional().default([]),
  payment_status: z.enum(['unpaid', 'paid']),
});

const updateExpenseSchema = z.object({
  expense_name: z.string().min(1).max(255).optional(),
  amount: z.number().min(0).max(999999999).optional(),
  expense_date: expenseDateTimeString.optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  image_urls: z.array(z.string().url()).optional(),
  payment_status: z.enum(['unpaid', 'paid']).optional(),
});

export class HRController {
  static async getEmployees(req: Request, res: Response) {
    try {
      const data = await HRService.getEmployees();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getEmployeeById(req: Request, res: Response) {
    try {
      const data = await HRService.getEmployeeById(req.params.id as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async createEmployee(req: Request, res: Response) {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        throw new Error('Unauthorized to create employee');
      }
      const validated = createEmployeeSchema.parse(req.body);
      const data = await HRService.createEmployee(validated);
      return res.status(201).json(successResponse(data, 'Employee created successfully'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updateEmployeeStatus(req: Request, res: Response) {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        throw new Error('Unauthorized to update employee status');
      }
      const { is_active } = req.body;
      const data = await HRService.updateEmployeeStatus(req.params.id as string, is_active);
      return res.status(200).json(successResponse(data, 'Employee status updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updateEmployee(req: Request, res: Response) {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        throw new Error('Unauthorized to update employee');
      }

      const validated = updateEmployeeSchema.parse(req.body);
      const data = await HRService.updateEmployee(req.params.id as string, {
        full_name: validated.full_name!,
        phone: validated.phone,
        role: validated.role!,
        date_of_birth: validated.date_of_birth,
        gender: validated.gender,
        citizen_id: validated.citizen_id,
        job_title: validated.job_title,
        department: validated.department,
        personal_email: validated.personal_email,
        emergency_contact_name: validated.emergency_contact_name,
        emergency_contact_phone: validated.emergency_contact_phone,
        emergency_contact_relationship: validated.emergency_contact_relationship,
        city: validated.city,
        district: validated.district,
        ward: validated.ward,
        address_line: validated.address_line,
        temporary_address: validated.temporary_address,
      });
      return res.status(200).json(successResponse(data, 'Employee updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async deleteEmployee(req: Request, res: Response) {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        throw new Error('Unauthorized to delete employee');
      }
      const data = await HRService.deleteEmployee(req.params.id as string);
      return res.status(200).json(successResponse(data, 'Employee deleted'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async createLeaveRequest(req: Request, res: Response) {
    try {
      const validated = createLeaveRequestSchema.parse(req.body);
      const data = await HRService.createLeaveRequest(req.user!.id, validated);
      return res.status(201).json(successResponse(data, 'Leave request created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getLeaveRequests(req: Request, res: Response) {
    try {
      const employeeId = req.user!.role === 'manager' ? (req.query.employeeId as string) : req.user!.id;
      const data = await HRService.getLeaveRequests(employeeId);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async reviewLeaveRequest(req: Request, res: Response) {
    try {
      const validated = reviewLeaveRequestSchema.parse(req.body);
      const data = await HRService.reviewLeaveRequest(req.params.id as string, validated, req.user!);
      return res.status(200).json(successResponse(data, 'Leave request reviewed'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async createSalaryAdvance(req: Request, res: Response) {
    try {
      const validated = createSalaryAdvanceSchema.parse(req.body);
      const data = await HRService.createSalaryAdvance(req.user!.id, validated);
      return res.status(201).json(successResponse(data, 'Salary advance request created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async approveSalaryAdvance(req: Request, res: Response) {
    try {
      const data = await HRService.approveSalaryAdvance(req.params.id as string, req.user!.id);
      return res.status(200).json(successResponse(data, 'Salary advance approved'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async markAttendance(req: Request, res: Response) {
    try {
      const validated = markAttendanceSchema.parse(req.body) as any;
      
      // Permission check: regular staff/driver can only mark for themselves
      if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
        if (validated.employee_id !== req.user!.id) {
          return res.status(403).json(errorResponse('You can only mark attendance for yourself', 'FORBIDDEN'));
        }
      }

      const data = await HRService.markAttendance(validated);
      return res.status(201).json(successResponse(data, 'Attendance marked'));
    } catch (err: any) {
      console.error('Attendance Error:', err);
      return res.status(400).json(errorResponse(err.message || String(err)));
    }
  }

  static async getAttendance(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      if (startDate && endDate) {
        const data = await HRService.getAttendanceByRange(startDate, endDate);
        return res.status(200).json(successResponse(data));
      }

      const data = await HRService.getAllAttendanceForDate(date);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getSalaryAdvances(req: Request, res: Response) {
    try {
      const data = await HRService.getSalaryAdvances(req.user!.id, req.user!.role);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async createCompensatoryAttendance(req: Request, res: Response) {
    try {
      const validated = createCompensatorySchema.parse(req.body);
      const data = await HRService.createCompensatoryAttendance(req.user!.id, validated);
      return res.status(201).json(successResponse(data, 'Compensatory attendance created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getCompensatoryAttendances(req: Request, res: Response) {
    try {
      const data = await HRService.getCompensatoryAttendances();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async reviewCompensatoryAttendance(req: Request, res: Response) {
    try {
      const validated = reviewCompensatorySchema.parse(req.body);
      const data = await HRService.reviewCompensatoryAttendance(req.params.id as string, validated.status, req.user!.id);
      return res.status(200).json(successResponse(data, 'Compensatory attendance reviewed'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getExpenses(req: Request, res: Response) {
    try {
      const data = await HRService.getExpenses(req.user!.id, req.user!.role);
      return res.json(successResponse(data));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  }

  static async createExpense(req: Request, res: Response) {
    try {
      const validated = createExpenseSchema.parse(req.body);
      
      const payload = {
        employee_id: (req.user!.role !== 'admin' && req.user!.role !== 'manager') 
          ? req.user!.id 
          : validated.employee_id,
        expense_name: validated.expense_name,
        amount: validated.amount,
        expense_date: validated.expense_date,
        payment_status: validated.payment_status,
        vehicle_id: validated.vehicle_id,
        image_urls: validated.image_urls,
      };

      const data = await HRService.createExpense(req.user!.id, payload);
      return res.status(201).json(successResponse(data, 'Tạo phiếu chi phí thành công'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updateExpense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validated = updateExpenseSchema.parse(req.body);
      const data = await HRService.updateExpense(id, req.user!.id, req.user!.role, validated);
      return res.json(successResponse(data, 'Cập nhật phiếu chi phí thành công'));
    } catch (err: any) {
      const status = err.message.includes('quyền') || err.message.includes('xác nhận') ? 403 : 400;
      return res.status(status).json(errorResponse(err.message));
    }
  }

  static async deleteExpense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await HRService.deleteExpense(id, req.user!.id, req.user!.role);
      return res.json(successResponse(null, 'Đã xóa phiếu chi phí'));
    } catch (err: any) {
      const status = err.message.includes('quyền') || err.message.includes('xác nhận') ? 403 : 500;
      return res.status(status).json(errorResponse(err.message));
    }
  }

  static async confirmExpense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await HRService.confirmExpense(id, req.user!.id);
      return res.json(successResponse(data, 'Đã xác nhận đưa tiền thành công'));
    } catch (err: any) {
      const status = err.message.includes('không tìm') || err.message.includes('Không tìm') ? 404
        : err.message.includes('trạng thái') ? 400
        : 500;
      return res.status(status).json(errorResponse(err.message));
    }
  }
}
