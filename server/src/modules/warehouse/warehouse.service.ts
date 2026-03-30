import { supabaseService } from '../../config/supabase';

export class WarehouseService {
  static async getAll() {
    const { data, error } = await supabaseService.from('warehouses').select('*');
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService.from('warehouses').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  static async create(warehouseData: any) {
    const { data, error } = await supabaseService.from('warehouses').insert(warehouseData).select().single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, warehouseData: any) {
    const { data, error } = await supabaseService.from('warehouses').update(warehouseData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
