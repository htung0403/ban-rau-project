import { supabaseService } from '../../config/supabase';
export class ExportOrderService {
  static async getAll(filters: any) {
    let query = supabaseService.from('export_orders').select('*, profiles(full_name), customers(id, name, debt)');
    
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


    // Business Logic: Update customer debt is now handled by DB triggers on export_orders -> ledger -> customers

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
       // Create a receipt to track this payment/adjustment.
       // This will trigger the ledger and update the customer's total debt.
       await supabaseService.from('receipts').insert({
         customer_id: data.customer_id,
         amount: diff,
         payment_date: new Date().toISOString().split('T')[0],
         notes: `Cập nhật thanh toán đơn xuất: ${data.item_name}`,
       });
    }

    return data;
  }
}
