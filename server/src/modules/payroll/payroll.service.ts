import { supabaseService } from '../../config/supabase';
import { addDays, format } from 'date-fns';

export class PayrollService {
  static async generateWeekly(weekStart: string, createdBy: string) {
    const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd');

    // 1. Get all employees
    const { data: employees } = await supabaseService.from('profiles').select('id, role').in('role', ['staff', 'driver', 'manager', 'admin']);
    
    // 2. Get role salaries
    const { data: roleSalaries } = await supabaseService.from('role_salaries').select('role_key, daily_wage');

    const promises = (employees || []).map(async (emp) => {
      // 3. Count work days
      const countPromise = supabaseService
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', emp.id)
        .eq('is_present', true)
        .gte('work_date', weekStart)
        .lte('work_date', weekEnd);

      // 4. Sum advances
      const advancesPromise = supabaseService
        .from('salary_advances')
        .select('amount')
        .eq('employee_id', emp.id)
        .eq('status', 'approved')
        .eq('week_start', weekStart);
      
      // 5. Find existing
      const existingPromise = supabaseService
        .from('payroll')
        .select('id, status')
        .eq('employee_id', emp.id)
        .eq('week_start', weekStart)
        .single();

      const [countRes, advancesRes, existingRes] = await Promise.all([countPromise, advancesPromise, existingPromise]);

      const totalAdvances = advancesRes.data?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
      const dailyWage = roleSalaries?.find(rs => rs.role_key === emp.role)?.daily_wage || 0;

      let dbResult;
      
      if (existingRes.data) {
        dbResult = await supabaseService
          .from('payroll')
          .update({
            days_worked: countRes.count || 0,
            daily_wage: dailyWage,
            total_advances: totalAdvances,
            created_by: createdBy,
            status: existingRes.data.status === 'paid' ? 'paid' : 'confirmed',
            approved_by: createdBy,
            approved_at: new Date(),
          })
          .eq('id', existingRes.data.id)
          .select()
          .single();
      } else {
        dbResult = await supabaseService
          .from('payroll')
          .insert({
            employee_id: emp.id,
            week_start: weekStart,
            week_end: weekEnd,
            days_worked: countRes.count || 0,
            daily_wage: dailyWage,
            total_advances: totalAdvances,
            created_by: createdBy,
            status: 'confirmed',
            approved_by: createdBy,
            approved_at: new Date(),
          })
          .select()
          .single();
      }
      
      if (dbResult && !dbResult.error) {
        return dbResult.data;
      } else {
         console.error("Payroll generate error:", dbResult?.error);
         return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter(Boolean);
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

  static async confirm(id: string, approvedBy: string) {
    const { data, error } = await supabaseService
      .from('payroll')
      .update({ 
        status: 'confirmed', 
        approved_by: approvedBy, 
        approved_at: new Date() 
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateStatuses(updates: { id: string, status: string }[], updatedBy: string) {
    const promises = updates.map(async (update) => {
      const { data, error } = await supabaseService
        .from('payroll')
        .update({ 
          status: update.status,
          ...(update.status === 'confirmed' || update.status === 'paid' ? { approved_by: updatedBy, approved_at: new Date() } : {})
        })
        .eq('id', update.id)
        .select()
        .single();
      
      if (error) console.error("Payroll status update error:", error);
      return error ? null : data;
    });

    const results = await Promise.all(promises);
    return results.filter(Boolean);
  }
}
