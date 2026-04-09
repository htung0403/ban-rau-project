import { supabaseService } from '../../config/supabase';
import { format, startOfWeek } from 'date-fns';

export class HRService {
  static async getEmployees() {
    const { data, error } = await supabaseService
      .from('profiles')
      .select('*')
      .neq('role', 'customer');
    if (error) throw error;
    return data;
  }

  static async createEmployee(payload: any) {
    const { email, password, full_name, phone, role } = payload;

    // 1. Check if user already exists in auth to avoid duplicate errors
    const { data: existingUser } = await (supabaseService.auth as any).admin.listUsers();
    const userAlreadyExists = existingUser?.users?.find((u: any) => u.email === email);
    
    let userId: string;

    if (userAlreadyExists) {
      userId = userAlreadyExists.id;
      console.log('User already exists in Auth, attempting to fix profile...');
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await (supabaseService.auth as any).admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });

      if (authError) throw authError;
      userId = authData.user.id;
    }

    // 2. Profile record: Use upsert with retry or separate error handling
    try {
      // Small delay to allow potential DB triggers to finish
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .upsert({
          id: userId,
          email,
          full_name,
          phone,
          role,
          is_active: true
        }, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        // If we just created the user but profile failed, we might want to cleanup auth
        if (!userAlreadyExists) {
          await (supabaseService.auth as any).admin.deleteUser(userId);
        }
        throw profileError;
      }

      return profile;
    } catch (error) {
      console.error('Profile creation failed:', error);
      throw error;
    }
  }

  static async updateEmployeeStatus(id: string, is_active: boolean) {
    const { data, error } = await supabaseService
      .from('profiles')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteEmployee(id: string) {
    // Nullify all FK references to this profile across the database
    const nullifyTasks = [
      supabaseService.from('warehouses').update({ manager_id: null }).eq('manager_id', id),
      supabaseService.from('price_settings').update({ updated_by: null }).eq('updated_by', id),
      supabaseService.from('vehicles').update({ driver_id: null }).eq('driver_id', id),
      supabaseService.from('delivery_vehicles').update({ driver_id: null }).eq('driver_id', id),
      supabaseService.from('import_orders').update({ received_by: null }).eq('received_by', id),
      supabaseService.from('vegetable_orders').update({ received_by: null }).eq('received_by', id),
      supabaseService.from('export_orders').update({ created_by: null }).eq('created_by', id),
      supabaseService.from('payment_collections').update({ driver_id: null as any }).eq('driver_id', id),
      supabaseService.from('payment_collections').update({ receiver_id: null }).eq('receiver_id', id),
      supabaseService.from('vehicle_checkins').update({ driver_id: null }).eq('driver_id', id),
      supabaseService.from('leave_requests').update({ employee_id: null }).eq('employee_id', id),
      supabaseService.from('leave_requests').update({ reviewed_by: null }).eq('reviewed_by', id),
      supabaseService.from('salary_advances').update({ employee_id: null }).eq('employee_id', id),
      supabaseService.from('salary_advances').update({ approved_by: null }).eq('approved_by', id),
      supabaseService.from('attendance').update({ employee_id: null as any }).eq('employee_id', id),
      supabaseService.from('compensatory_attendances').update({ employee_id: null as any }).eq('employee_id', id),
      supabaseService.from('compensatory_attendances').update({ approved_by: null }).eq('approved_by', id),
      supabaseService.from('payroll').update({ employee_id: null }).eq('employee_id', id),
      supabaseService.from('payroll').update({ created_by: null }).eq('created_by', id),
      supabaseService.from('payroll').update({ approved_by: null }).eq('approved_by', id),
      supabaseService.from('receipts').update({ created_by: null }).eq('created_by', id),
    ];

    await Promise.all(nullifyTasks);

    // Delete profile row
    const { error: profileError } = await supabaseService
      .from('profiles')
      .delete()
      .eq('id', id);
    if (profileError) throw profileError;

    // Delete auth user
    const { error: authError } = await (supabaseService.auth as any).admin.deleteUser(id);
    if (authError) {
      console.error('Failed to delete auth user (profile already removed):', authError);
    }

    return { success: true };
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

  static async reviewLeaveRequest(id: string, reviewData: any, user: any) {
    if (user.role !== 'admin' && user.role !== 'manager') {
      if (reviewData.status !== 'rejected') {
         throw new Error('Unauthorized');
      }
      const { data: req } = await supabaseService.from('leave_requests').select('employee_id').eq('id', id).single();
      if (req?.employee_id !== user.id) {
         throw new Error('Unauthorized');
      }
    }

    const { data, error } = await supabaseService
      .from('leave_requests')
      .update({
        ...reviewData,
        reviewed_by: user.id,
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
    const dt = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekStartStr = format(dt, 'yyyy-MM-dd');

    // 1. Mark as approved AND set week_start to current week so it deducts automatically
    const { data: advance, error: approveError } = await supabaseService
      .from('salary_advances')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date(),
        week_start: weekStartStr
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
          .update({ total_advances: Number(payroll.total_advances || 0) + Number(advance.amount) })
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

  static async getSalaryAdvances(userId: string, role: string) {
    let query = supabaseService
      .from('salary_advances')
      .select('*, profiles!salary_advances_employee_id_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (role !== 'manager' && role !== 'admin') {
      query = query.eq('employee_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async createCompensatoryAttendance(employeeId: string, payload: any) {
    const { data, error } = await supabaseService
      .from('compensatory_attendances')
      .insert({ ...payload, employee_id: employeeId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getCompensatoryAttendances() {
    const { data, error } = await supabaseService
      .from('compensatory_attendances')
      .select('*, profiles!compensatory_attendances_employee_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async reviewCompensatoryAttendance(id: string, status: string, approvedBy: string) {
    const { data: request, error } = await supabaseService
      .from('compensatory_attendances')
      .update({
        status,
        approved_by: approvedBy,
        approved_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    if (status === 'approved') {
      await supabaseService.from('attendance').upsert({
        employee_id: request.employee_id,
        work_date: request.work_date,
        is_present: true,
        check_in_time: request.check_in_time,
        check_out_time: request.check_out_time,
        note: request.reason,
      }, { onConflict: 'employee_id,work_date' });
    }

    return request;
  }
}
