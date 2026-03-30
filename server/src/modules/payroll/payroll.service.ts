import { supabaseService } from '../../config/supabase';
import { addDays, format } from 'date-fns';

export class PayrollService {
  static async generateWeekly(weekStart: string, createdBy: string) {
    const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd');

    // 1. Get all employees
    const { data: employees } = await supabaseService.from('profiles').select('id, role').in('role', ['staff', 'driver', 'manager', 'admin']);
    
    // 2. Get price settings
    const { data: settings } = await supabaseService.from('price_settings').select('setting_key, value');
    const staffWage = settings?.find(s => s.setting_key === 'daily_wage_staff')?.value || 0;
    const driverWage = settings?.find(s => s.setting_key === 'daily_wage_driver')?.value || 0;

    const results = [];

    for (const emp of employees || []) {
      // 3. Count work days
      const { count } = await supabaseService
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', emp.id)
        .eq('is_present', true)
        .gte('work_date', weekStart)
        .lte('work_date', weekEnd);

      // 4. Sum advances
      const { data: advances } = await supabaseService
        .from('salary_advances')
        .select('amount')
        .eq('employee_id', emp.id)
        .eq('status', 'approved')
        .eq('week_start', weekStart);
      
      const totalAdvances = advances?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
      const dailyWage = emp.role === 'driver' ? driverWage : staffWage;

      // 5. Upsert payroll
      const { data, error } = await supabaseService
        .from('payroll')
        .upsert({
          employee_id: emp.id,
          week_start: weekStart,
          week_end: weekEnd,
          days_worked: count || 0,
          daily_wage: dailyWage,
          total_advances: totalAdvances,
          created_by: createdBy,
          status: 'draft',
        }, {
          onConflict: 'employee_id, week_start'
        })
        .select()
        .single();
      
      if (!error) results.push(data);
    }

    return results;
  }

  static async getAll() {
    const { data, error } = await supabaseService.from('payroll').select('*, profiles!payroll_employee_id_fkey(full_name)');
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService.from('payroll').select('*, profiles!payroll_employee_id_fkey(full_name)').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  static async confirm(id: string) {
    const { data, error } = await supabaseService.from('payroll').update({ status: 'confirmed' }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
