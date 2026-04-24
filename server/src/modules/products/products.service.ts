import { supabaseService } from '../../config/supabase';
import { normalizeEntityNameKey } from '../../utils/normalizeEntityName';

export class ProductService {
  static async getAll() {
    const { data, error } = await supabaseService
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(productData: any) {
    const category = productData.category || 'standard';
    const nameKey = normalizeEntityNameKey(productData.name);
    if (!nameKey) {
      throw new Error('Tên hàng không hợp lệ');
    }

    const { data: inCategory, error: fetchErr } = await supabaseService
      .from('products')
      .select('*')
      .eq('category', category);
    if (fetchErr) throw fetchErr;

    const rows = inCategory || [];
    const activeDup = rows.find(
      (p: any) => p.is_active === true && normalizeEntityNameKey(p.name) === nameKey,
    );
    if (activeDup) return activeDup;

    const inactive = rows.find(
      (p: any) => p.is_active === false && normalizeEntityNameKey(p.name) === nameKey,
    );
    if (inactive) {
      const { data, error } = await supabaseService
        .from('products')
        .update({ ...productData, is_active: true })
        .eq('id', inactive.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabaseService
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, productData: any) {
    const { data, error } = await supabaseService
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseService
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}
