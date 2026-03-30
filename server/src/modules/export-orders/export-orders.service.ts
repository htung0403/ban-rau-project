import { supabaseService } from '../../config/supabase';
import { InventoryService } from '../inventory/inventory.service';

export class ExportOrderService {
  static async getAll(filters: any) {
    let query = supabaseService.from('export_orders').select('*, profiles(full_name), customers(name)');
    
    if (filters.date) query = query.eq('export_date', filters.date);
    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async create(orderData: any, userId: string) {
    const { data, error } = await supabaseService
      .from('export_orders')
      .insert({
        ...orderData,
        created_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;

    // Adjust inventory (decrease) if product_id and warehouse_id are provided
    if (data.product_id && data.warehouse_id && data.quantity > 0) {
      try {
        await InventoryService.adjustStock(data.warehouse_id, data.product_id, -data.quantity);
      } catch (inventoryError) {
        console.error('Failed to adjust inventory for export order:', inventoryError);
      }
    }

    // Business Logic: Update customer debt
    if (data.customer_id && data.debt_amount > 0) {
      const { error: debtError } = await supabaseService.rpc('increment_customer_debt', {
        cust_id: data.customer_id,
        amount: data.debt_amount
      });
      // Fallback if RPC not exists:
      if (debtError) {
        const { data: customer } = await supabaseService.from('customers').select('debt').eq('id', data.customer_id).single();
        const newDebt = (customer?.debt || 0) + data.debt_amount;
        await supabaseService.from('customers').update({ debt: newDebt }).eq('id', data.customer_id);
      }
    }

    return data;
  }

  static async updatePayment(id: string, paymentData: { paid_amount: number, status: string }) {
    const { data: oldOrder, error: fetchError } = await supabaseService
      .from('export_orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;

    const { data, error } = await supabaseService
      .from('export_orders')
      .update({
        paid_amount: paymentData.paid_amount,
        payment_status: paymentData.status,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // Business Logic: Adjust customer debt if paid amount changed
    const diff = paymentData.paid_amount - (oldOrder.paid_amount || 0);
    if (diff !== 0 && data.customer_id) {
       const { error: debtError } = await supabaseService.rpc('increment_customer_debt', {
        cust_id: data.customer_id,
        amount: -diff // decrement debt by paid amount
      });
      // Fallback if RPC not exists:
      if (debtError) {
        const { data: customer } = await supabaseService.from('customers').select('debt').eq('id', data.customer_id).single();
        const newDebt = (customer?.debt || 0) - diff;
        await supabaseService.from('customers').update({ debt: newDebt }).eq('id', data.customer_id);
      }
    }

    return data;
  }
}
