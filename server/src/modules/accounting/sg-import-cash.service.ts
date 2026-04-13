import { supabaseService } from '../../config/supabase';
import { goodsScopeIsDriverRole } from '../../utils/goodsScope';

export class SgImportCashService {
  static async list(userId: string, role: string, filters: { from?: string; to?: string }) {
    let query = supabaseService
      .from('import_orders')
      .select(
        `
        id,
        order_code,
        order_date,
        order_time,
        receiver_name,
        license_plate,
        driver_name,
        total_amount,
        payment_status,
        received_by,
        sg_cash_handover_confirmed_at,
        sg_cash_handover_confirmed_by,
        customers:customers!import_orders_customer_id_fkey(id, name, phone),
        collector:profiles!import_orders_received_by_fkey(id, full_name),
        confirmer:profiles!import_orders_sg_cash_handover_confirmed_by_fkey(id, full_name)
      `
      )
      .is('deleted_at', null)
      .eq('payment_status', 'paid')
      .gt('total_amount', 0)
      .order('order_date', { ascending: false })
      .order('order_time', { ascending: false });

    if (filters.from) query = query.gte('order_date', filters.from);
    if (filters.to) query = query.lte('order_date', filters.to);

    if (goodsScopeIsDriverRole(role)) {
      query = query.eq('received_by', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  static async confirmHandover(importOrderId: string, userId: string) {
    const { data: row, error: findErr } = await supabaseService
      .from('import_orders')
      .select('id, payment_status, sg_cash_handover_confirmed_at')
      .eq('id', importOrderId)
      .is('deleted_at', null)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!row) throw new Error('Không tìm thấy phiếu nhập');
    if (row.payment_status !== 'paid') throw new Error('Phiếu chưa ở trạng thái đã trả');

    if (row.sg_cash_handover_confirmed_at) {
      return { alreadyConfirmed: true as const };
    }

    const { error: updateErr } = await supabaseService
      .from('import_orders')
      .update({
        sg_cash_handover_confirmed_at: new Date().toISOString(),
        sg_cash_handover_confirmed_by: userId,
      })
      .eq('id', importOrderId);

    if (updateErr) throw updateErr;
    return { alreadyConfirmed: false as const };
  }
}
