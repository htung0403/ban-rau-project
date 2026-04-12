import { supabaseService } from '../../config/supabase';
import type { UserPayload } from '../../types';
import {
  exportOrderRowMatchesGoodsScope,
  fetchDriverScopeForUser,
  goodsScopeFullAccess,
  goodsScopeIsDriverRole,
  goodsScopeIsStaffRole,
  type DriverScope,
} from '../../utils/goodsScope';

function deliverySourceSoftDeleted(d: any): boolean {
  const io = d?.import_orders;
  const vo = d?.vegetable_orders;
  const ioDel = Array.isArray(io) ? io[0]?.deleted_at : io?.deleted_at;
  const voDel = Array.isArray(vo) ? vo[0]?.deleted_at : vo?.deleted_at;
  return Boolean(ioDel || voDel);
}

export class ExportOrderService {
  static async getAll(filters: any, actor?: UserPayload) {
    let query = supabaseService.from('export_orders').select('*, profiles(full_name), customers(id, name, debt)');

    if (filters.date) query = query.eq('export_date', filters.date);
    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return data;

    const deliveryIds = [...new Set(data.map((o: any) => o.product_id).filter(Boolean))] as string[];
    if (deliveryIds.length === 0) return data;

    const { data: deliveries, error: delErr } = await supabaseService
      .from('delivery_orders')
      .select(
        'id, import_orders(deleted_at, received_by, license_plate, driver_name), vegetable_orders(deleted_at, received_by, license_plate, driver_name), delivery_vehicles(driver_id, vehicle_id, vehicles(license_plate))'
      )
      .in('id', deliveryIds);

    if (delErr) throw delErr;

    const deliveryById = new Map((deliveries || []).map((d: any) => [d.id, d]));

    let driverScope: DriverScope | null = null;
    if (actor && goodsScopeIsDriverRole(actor.role) && !goodsScopeFullAccess(actor.role)) {
      driverScope = await fetchDriverScopeForUser(actor.id);
    }

    const needScope =
      actor &&
      !goodsScopeFullAccess(actor.role) &&
      (goodsScopeIsStaffRole(actor.role) || goodsScopeIsDriverRole(actor.role));

    return data.filter((o: any) => {
      if (!o.product_id) return true;
      const d = deliveryById.get(o.product_id);
      if (!d) return true;
      if (deliverySourceSoftDeleted(d)) return false;
      if (needScope && actor && !exportOrderRowMatchesGoodsScope(o, d, actor, driverScope)) return false;
      return true;
    });
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

  static async bulkDelete(ids: string[]) {
    const { error } = await supabaseService
      .from('export_orders')
      .delete()
      .in('id', ids);
    if (error) throw error;
    return { deleted: ids.length };
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
