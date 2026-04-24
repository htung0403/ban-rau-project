import { supabaseService } from '../../config/supabase';

export class AccountingService {
  static async getDebts() {
    const { data, error } = await supabaseService
      .from('customers')
      .select('id, name, debt, total_revenue')
      .gt('debt', 0);
    if (error) throw error;
    return data;
  }

  static async getRevenueByDate(from: string, to: string) {
    const { data: stdData, error: stdError } = await supabaseService
      .from('import_orders')
      .select('total_amount, order_date')
      .gte('order_date', from)
      .lte('order_date', to);
    if (stdError) throw stdError;

    const { data: vegData, error: vegError } = await supabaseService
      .from('vegetable_orders')
      .select('total_amount, order_date')
      .gte('order_date', from)
      .lte('order_date', to);
    if (vegError) throw vegError;

    const data = [...(stdData || []), ...(vegData || [])];

    // Aggregating locally for simplicity, or use RPC for large datasets
    const aggregation = data?.reduce((acc: any, curr: any) => {
      const date = curr.order_date;
      acc[date] = (acc[date] || 0) + Number(curr.total_amount);
      return acc;
    }, {});

    return aggregation;
  }

  static async getRevenueByVehicle(date: string) {
    const { data, error } = await supabaseService
      .from('payment_collections')
      .select('amount, vehicle_id, vehicles(license_plate)')
      .eq('collected_date', date);
    
    if (error) throw error;

    const aggregation = data?.reduce((acc: any, curr: any) => {
      const plate = curr.vehicles?.license_plate || 'Unknown';
      acc[plate] = (acc[plate] || 0) + Number(curr.amount);
      return acc;
    }, {});

    return aggregation;
  }

  static async getInvoiceOrders(filters: {
    category: 'standard' | 'vegetable';
    dateFrom?: string;
    dateTo?: string;
    customer_id?: string;
    invoice_status?: 'all' | 'exported' | 'not_exported';
  }) {
    const isVeg = filters.category === 'vegetable';
    const tName = isVeg ? 'vegetable_orders' : 'import_orders';
    const customerJoin = isVeg
      ? 'customers:customers!vegetable_orders_customer_id_fkey(id, name, phone, address)'
      : 'customers:customers!import_orders_customer_id_fkey(id, name, phone, address)';
    const senderJoin = isVeg
      ? 'sender_customers:customers!vegetable_orders_sender_id_fkey(id, name, phone)'
      : 'sender_customers:customers!import_orders_sender_id_fkey(id, name, phone)';
    const receivedByJoin = isVeg
      ? 'profiles(full_name, role)'
      : 'profiles:profiles!import_orders_received_by_fkey(full_name, role)';

    let q = supabaseService
      .from(tName)
      .select(`id, order_code, order_date, order_time, sender_name, receiver_name, total_amount, invoice_exported, invoice_exported_at, payment_status, delivery_orders(delivery_date, delivery_time, created_at), ${customerJoin}, ${senderJoin}, ${receivedByJoin}`)
      .is('deleted_at', null)
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.dateFrom) q = q.gte('order_date', filters.dateFrom);
    if (filters.dateTo) q = q.lte('order_date', filters.dateTo);
    if (filters.customer_id) q = q.eq('customer_id', filters.customer_id);

    if (filters.invoice_status === 'exported') {
      q = q.eq('invoice_exported', true);
    } else if (filters.invoice_status === 'not_exported') {
      q = q.eq('invoice_exported', false);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  static async bulkMarkInvoiceExported(
    ids: string[],
    category: 'standard' | 'vegetable',
    userId: string,
    exported: boolean = true,
  ) {
    if (!ids || ids.length === 0) throw new Error('Không có đơn hàng nào được chọn');

    const tName = category === 'vegetable' ? 'vegetable_orders' : 'import_orders';
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      invoice_exported: exported,
      invoice_exported_at: exported ? now : null,
      invoice_exported_by: exported ? userId : null,
    };

    const { data, error } = await supabaseService
      .from(tName)
      .update(updateData)
      .in('id', ids)
      .select('id');

    if (error) throw error;
    return { updated: data?.length || 0 };
  }
}
