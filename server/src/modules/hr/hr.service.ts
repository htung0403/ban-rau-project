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

  static async markAttendance(employeeId: string, date: string, isPresent: boolean, note?: string) {
    const { data, error } = await supabaseService
      .from('attendance')
      .upsert({
        employee_id: employeeId,
        work_date: date,
        is_present: isPresent,
        note: note,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getAttendance(employeeId: string, weekStart: string) {
    // Basic implementation: get attendance for a period
    const { data, error } = await supabaseService
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('work_date', weekStart);
    if (error) throw error;
    return data;
  }
}
