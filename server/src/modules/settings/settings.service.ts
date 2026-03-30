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
}
