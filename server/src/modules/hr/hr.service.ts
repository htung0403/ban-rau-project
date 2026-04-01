import { supabaseService } from '../../config/supabase';

export class HRService {
  static async getEmployees() {
    const { data, error } = await supabaseService
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'staff', 'driver', 'manager']);
    if (error) throw error;
    return data;
  }

  static async getEmployeeById(id: string) {
    const { data, error } = await supabaseService.from('profiles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  static async createLeaveRequest(employeeId: string, leaveData: any) {
    const { data, error } = await supabaseService
      .from('leave_requests')
      .insert({ ...leaveData, employee_id: employeeId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getLeaveRequests(employeeId?: string) {
    let query = supabaseService.from('leave_requests').select('*, profiles!leave_requests_employee_id_fkey(full_name)');
    if (employeeId) query = query.eq('employee_id', employeeId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async reviewLeaveRequest(id: string, reviewData: any, reviewedBy: string) {
    const { data, error } = await supabaseService
      .from('leave_requests')
      .update({
        ...reviewData,
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async createSalaryAdvance(employeeId: string, advanceData: any) {
    const { data, error } = await supabaseService
      .from('salary_advances')
      .insert({ ...advanceData, employee_id: employeeId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async approveSalaryAdvance(id: string, approvedBy: string) {
    // 1. Mark as approved
    const { data: advance, error: approveError } = await supabaseService
      .from('salary_advances')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (approveError) throw approveError;

    // 2. Business Logic: Update payroll total_advances if payroll exists for that week
    if (advance.week_start) {
       const { data: payroll, error: payrollError } = await supabaseService
        .from('payroll')
        .select('id, total_advances')
        .eq('employee_id', advance.employee_id)
        .eq('week_start', advance.week_start)
        .single();
      
      if (payroll) {
        await supabaseService
          .from('payroll')
          .update({ total_advances: (payroll.total_advances || 0) + advance.amount })
          .eq('id', payroll.id);
      }
    }

    return advance;
  }

  static async markAttendance(payload: { 
    employee_id: string; 
    work_date: string; 
    is_present?: boolean; 
    check_in_time?: string | null; 
    check_out_time?: string | null; 
    note?: string 
  }) {
    const { data, error } = await supabaseService
      .from('attendance')
      .upsert(payload, { onConflict: 'employee_id,work_date' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getAttendanceByRange(startDate: string, endDate: string) {
    const { data, error } = await supabaseService
      .from('attendance')
      .select('*')
      .gte('work_date', startDate)
      .lte('work_date', endDate);
    if (error) throw error;
    return data;
  }

  static async getAllAttendanceForDate(date: string) {
    const { data, error } = await supabaseService
      .from('attendance')
      .select('*')
      .eq('work_date', date);
    if (error) throw error;
    return data;
  }
}
