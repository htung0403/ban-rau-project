import { supabaseService } from '../../config/supabase';

export class PriceSettingsService {
  static async getAll() {
    const { data, error } = await supabaseService.from('price_settings').select('*');
    if (error) throw error;
    return data;
  }

  static async update(key: string, value: number, description: string | undefined, updatedBy: string) {
    const { data, error } = await supabaseService
      .from('price_settings')
      .update({ value, description, updated_by: updatedBy, updated_at: new Date() })
      .eq('setting_key', key)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getByKey(key: string) {
    const { data, error } = await supabaseService.from('price_settings').select('*').eq('setting_key', key).single();
    if (error || !data) return null;
    return data;
  }

  // Role Salaries
  static async getRoleSalaries() {
    const { data, error } = await supabaseService.from('role_salaries').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  static async upsertRoleSalary(key: string, name: string, dailyWage: number, description?: string) {
    const { data, error } = await supabaseService
      .from('role_salaries')
      .upsert({ 
        role_key: key, 
        role_name: name, 
        daily_wage: dailyWage, 
        description,
        updated_at: new Date() 
      }, {
        onConflict: 'role_key'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteRoleSalary(key: string) {
    const { error } = await supabaseService.from('role_salaries').delete().eq('role_key', key);
    if (error) throw error;
    return true;
  }
}

export class GeneralSettingsService {
  static async getAll() {
    const { data, error } = await supabaseService.from('general_settings').select('*');
    if (error) throw error;
    return data;
  }

  static async getByKey(key: string) {
    const { data, error } = await supabaseService.from('general_settings').select('*').eq('setting_key', key).single();
    if (error && error.code !== 'PGRST116') throw error; // ignore no rows error
    return data || null;
  }

  static async upsert(key: string, value: any, description: string | undefined, updatedBy: string) {
    const { data, error } = await supabaseService
      .from('general_settings')
      .upsert({ 
        setting_key: key, 
        setting_value: value, 
        description,
        updated_at: new Date(),
        updated_by: updatedBy 
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
