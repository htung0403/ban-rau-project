import { supabaseService } from '../../config/supabase';

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
    // Check if a soft-deleted product with the same name and category exists
    const { data: existing } = await supabaseService
      .from('products')
      .select('*')
      .eq('name', productData.name)
      .eq('category', productData.category || 'standard')
      .eq('is_active', false)
      .maybeSingle();

    if (existing) {
      // Reactivate the soft-deleted product with updated data
      const { data, error } = await supabaseService
        .from('products')
        .update({ ...productData, is_active: true })
        .eq('id', existing.id)
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
