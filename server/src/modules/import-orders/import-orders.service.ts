import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';
import { InventoryService } from '../inventory/inventory.service';

export class ImportOrderService {
  static async getAll(filters: any) {
    let query = supabaseService.from('import_orders').select('*, profiles(full_name), warehouses(name), customers(name)');

    if (filters.date) query = query.eq('order_date', filters.date);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.sender) query = query.ilike('sender_name', `%${filters.sender}%`);
    if (filters.receiver) query = query.ilike('receiver_name', `%${filters.receiver}%`);
    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService.from('import_orders').select('*, profiles(full_name), warehouses(name), customers(name)').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  static async generateOrderCode(date: string) {
    const { count, error } = await supabaseService
      .from('import_orders')
      .select('*', { count: 'exact', head: true })
      .eq('order_date', date);

    if (error) throw error;

    const sequence = (count || 0) + 1;
    const dateStr = date.replace(/-/g, '');
    const seqStr = sequence.toString().padStart(3, '0');

    return `${dateStr}-${seqStr}`;
  }

  static async create(orderData: any, userId: string) {
    const orderDate = orderData.order_date || format(new Date(), 'yyyy-MM-dd');
    const orderCode = await this.generateOrderCode(orderDate);

    const { data, error } = await supabaseService
      .from('import_orders')
      .insert({
        ...orderData,
        order_code: orderCode,
        received_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Adjust inventory if product_id and warehouse_id are provided
    if (data.product_id && data.warehouse_id && data.quantity > 0) {
      try {
        await InventoryService.adjustStock(data.warehouse_id, data.product_id, data.quantity);
      } catch (inventoryError) {
        console.error('Failed to adjust inventory for import order:', inventoryError);
      }
    }

    return data;
  }

  static async update(id: string, orderData: any) {
    const { data, error } = await supabaseService
      .from('import_orders')
      .update(orderData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseService.from('import_orders').delete().eq('id', id);
    if (error) throw error;
  }
}
