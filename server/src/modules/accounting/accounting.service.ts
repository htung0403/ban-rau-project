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
}
