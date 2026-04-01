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
  check_out_time: z.string().nullable().optional(),
  note: z.string().optional(),
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
      const data = await HRService.reviewLeaveRequest(req.params.id as string, validated, req.user!.id);
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
}
