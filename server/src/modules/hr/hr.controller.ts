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
  is_present: z.boolean(),
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
      const validated = markAttendanceSchema.parse(req.body);
      const data = await HRService.markAttendance(
        validated.employee_id,
        validated.work_date,
        validated.is_present,
        validated.note
      );
      return res.status(201).json(successResponse(data, 'Attendance marked'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getAttendance(req: Request, res: Response) {
    try {
      const employeeId = (req.query.employee_id as string) || req.user!.id;
      const weekStart = req.query.week_start as string;
      const data = await HRService.getAttendance(employeeId, weekStart);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
