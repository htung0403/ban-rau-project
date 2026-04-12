import { supabaseService } from '../../config/supabase';
import { format, startOfWeek } from 'date-fns';

export class HRService {
  private static normalizePhoneForAuth(rawPhone: string): string {
    const digits = (rawPhone || '').replace(/\D/g, '');
    if (!digits) throw new Error('Phone is required');
    if (digits.startsWith('84')) return `+${digits}`;
    if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
    if (digits.startsWith('9') && digits.length === 9) return `+84${digits}`;
    return `+${digits}`;
  }

  private static buildPhoneCandidates(rawPhone: string): string[] {
    const raw = (rawPhone || '').trim();
    const digits = raw.replace(/\D/g, '');
    const candidates = new Set<string>([raw, digits]);

    if (digits.startsWith('84') && digits.length >= 10) {
      candidates.add(`+${digits}`);
      candidates.add(`0${digits.slice(2)}`);
    } else if (digits.startsWith('0') && digits.length >= 10) {
      candidates.add(`84${digits.slice(1)}`);
      candidates.add(`+84${digits.slice(1)}`);
    }

    return Array.from(candidates).filter(Boolean);
  }

  static async getEmployees() {
    const { data, error } = await supabaseService
      .from('profiles')
      .select('*, app_user_roles(role_id, app_roles(id, role_key, role_name))')
      .neq('role', 'customer');
    if (error) throw error;
    return data;
  }

  static async createEmployee(payload: any) {
    const { password, full_name, phone, role } = payload;
    const authPhone = this.normalizePhoneForAuth(phone);
    const phoneCandidates = this.buildPhoneCandidates(phone);

    const { data: existedProfile, error: existedProfileError } = await supabaseService
      .from('profiles')
      .select('id, full_name, phone')
      .in('phone', phoneCandidates)
      .limit(1)
      .maybeSingle();

    if (existedProfileError) throw existedProfileError;
    if (existedProfile) {
      throw new Error(`Số điện thoại ${phone} đã tồn tại (${existedProfile.full_name || existedProfile.id})`);
    }

    // 1. Check auth users to prevent creating duplicate phone identities
    const { data: existingUser } = await (supabaseService.auth as any).admin.listUsers();
    const userAlreadyExists = existingUser?.users?.find((u: any) => u.phone === authPhone);
    if (userAlreadyExists) {
      throw new Error(`Số điện thoại ${phone} đã tồn tại trong hệ thống đăng nhập`);
    }

    // Create new auth user
    const { data: authData, error: authError } = await (supabaseService.auth as any).admin.createUser({
      phone: authPhone,
      password,
      phone_confirm: true,
      user_metadata: { full_name, role }
    });

    if (authError) throw authError;
    const userId = authData.user.id;
    const authEmail = authData.user.email || null;

    // 2. Profile record: Use upsert with retry or separate error handling
    try {
      // Small delay to allow potential DB triggers to finish
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .upsert({
          id: userId,
          email: authEmail,
          full_name,
          phone,
          role,
          is_active: true
        }, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        // Roll back auth user if profile creation failed
        await (supabaseService.auth as any).admin.deleteUser(userId);
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

  static async updateEmployee(id: string, payload: {
    full_name: string;
    phone?: string | null;
    role: string;
    date_of_birth?: string | null;
    gender?: 'male' | 'female' | 'other' | null;
    citizen_id?: string | null;
    job_title?: string | null;
    department?: string | null;
    personal_email?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    city?: string | null;
    district?: string | null;
    ward?: string | null;
    address_line?: string | null;
    temporary_address?: string | null;
  }) {
    const { data, error } = await supabaseService
      .from('profiles')
      .update({
        full_name: payload.full_name,
        phone: payload.phone || null,
        role: payload.role,
        date_of_birth: payload.date_of_birth || null,
        gender: payload.gender || null,
        citizen_id: payload.citizen_id || null,
        job_title: payload.job_title || null,
        department: payload.department || null,
        personal_email: payload.personal_email || null,
        emergency_contact_name: payload.emergency_contact_name || null,
        emergency_contact_phone: payload.emergency_contact_phone || null,
        emergency_contact_relationship: payload.emergency_contact_relationship || null,
        city: payload.city || null,
        district: payload.district || null,
        ward: payload.ward || null,
        address_line: payload.address_line || null,
        temporary_address: payload.temporary_address || null,
      })
      .eq('id', id)
      .select('*, app_user_roles(role_id, app_roles(id, role_key, role_name))')
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
      supabaseService.from('vehicles').update({ in_charge_id: null }).eq('in_charge_id', id),
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
    const { data, error } = await supabaseService
      .from('profiles')
      .select('*, app_user_roles(role_id, app_roles(id, role_key, role_name))')
      .eq('id', id)
      .single();
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
