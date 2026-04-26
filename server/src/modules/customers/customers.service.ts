import { randomUUID } from 'crypto';
import { supabaseService } from '../../config/supabase';
import { hashPassword } from '../../utils/password';
import { normalizeEntityNameKey } from '../../utils/normalizeEntityName';

export class CustomerService {
  static async getAll(type?: string, isLoyal?: boolean) {
    let query = supabaseService.from('customers').select('*').is('deleted_at', null);
    if (type) {
      query = query.eq('customer_type', type);
    }
    if (isLoyal !== undefined) {
      query = query.eq('is_loyal', isLoyal);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async bulkSetLoyal(customerIds: string[], isLoyal: boolean) {
    if (!customerIds || customerIds.length === 0) return [];
    
    const { data, error } = await supabaseService
      .from('customers')
      .update({ is_loyal: isLoyal })
      .in('id', customerIds)
      .select();
      
    if (error) throw error;
    return data;
  }

  static async getDeliveryOrders(id: string) {
    const { data: importOrders, error: ioError } = await supabaseService
      .from('import_orders')
      .select('id')
      .eq('customer_id', id);
      
    if (ioError) throw ioError;
    if (!importOrders || importOrders.length === 0) return [];

    const importOrderIds = importOrders.map((o: any) => o.id);
    const CHUNK_SIZE = 100;
    const allDeliveryOrders: any[] = [];
    
    for (let i = 0; i < importOrderIds.length; i += CHUNK_SIZE) {
      const chunk = importOrderIds.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabaseService
        .from('delivery_orders')
        .select('*, delivery_vehicles(*, profiles:driver_id(full_name))')
        .eq('order_category', 'standard')
        .in('import_order_id', chunk);
        
      if (error) throw error;
      if (data) allDeliveryOrders.push(...data);
    }
    
    return allDeliveryOrders;
  }

  static async updateDeliveryOrderPrices(customerId: string, updates: { deliveryOrderId: string, unitPrice: number }[]) {
    const results = [];
    for (const update of updates) {
      const { data, error } = await supabaseService
        .from('delivery_orders')
        .update({ 
          unit_price: update.unitPrice, 
          price_confirmed: true 
        })
        .eq('id', update.deliveryOrderId)
        .select();
        
      if (error) throw error;
      if (data && data.length > 0) {
         results.push(data[0]);
      }
    }
    return results;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService
      .from('customers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    return data;
  }

  static async getByUserId(userId: string) {
    const { data, error } = await supabaseService
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned, which is fine
    return data;
  }

  static async getOrders(id: string) {
    const { data: stdOrders, error: stdError } = await supabaseService
      .from('import_orders')
      .select('*')
      .eq('customer_id', id);
    if (stdError) throw stdError;

    const { data: vegOrders, error: vegError } = await supabaseService
      .from('vegetable_orders')
      .select('*')
      .eq('customer_id', id);
    if (vegError) throw vegError;

    const allData = [
      ...(stdOrders || []).map(o => ({ ...o, order_category: 'standard' })),
      ...(vegOrders || []).map(o => ({ ...o, order_category: 'vegetable' }))
    ];

    allData.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return allData;
  }

  static async getExportOrders(id: string) {
    const { data, error } = await supabaseService
      .from('export_orders')
      .select('*')
      .eq('customer_id', id)
      .order('export_date', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async getReceipts(id: string) {
    const { data, error } = await supabaseService
      .from('receipts')
      .select('*, profiles(full_name)')
      .eq('customer_id', id)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async create(customerData: any) {
    const customerType = customerData.customer_type || 'retail';
    const nameKey = normalizeEntityNameKey(customerData.name);
    if (nameKey) {
      const { data: candidates, error: findErr } = await supabaseService
        .from('customers')
        .select('*')
        .eq('customer_type', customerType)
        .is('deleted_at', null);
      if (findErr) throw findErr;
      const existing = (candidates || []).find(
        (c: any) => normalizeEntityNameKey(c.name) === nameKey,
      );
      if (existing) return existing;
    }

    const { data, error } = await supabaseService.from('customers').insert(customerData).select().single();
    if (error) throw error;
    return data;
  }

  static async update(
    id: string,
    payload: {
      name?: string;
      phone?: string | null;
      address?: string | null;
      customer_type?: 'retail' | 'wholesale' | 'grocery' | 'vegetable' | 'grocery_sender' | 'grocery_receiver' | 'vegetable_sender' | 'vegetable_receiver';
    }
  ) {
    const { data, error } = await supabaseService
      .from('customers')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async softDelete(id: string) {
    const { error } = await supabaseService
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) throw error;
  }

  static async updateDebtPayment(id: string, payload: { amount: number, payment_date?: string, payment_time?: string, collector_id?: string, notes?: string }, userId?: string) {
    const paymentDateStr = payload.payment_date || new Date().toISOString().split('T')[0];
    const createdBy = payload.collector_id || userId;
    
    // Combine datetime to TIMESTAMPTZ (assuming +07:00 or system timezone)
    let paymentTimestampStr = paymentDateStr;
    if (payload.payment_time) {
      paymentTimestampStr = `${paymentDateStr}T${payload.payment_time}:00+07:00`;
    }
    
    // Call the atomic RPC function that handles receipt creation, ledger, and FIFO distribution
    const { data, error } = await supabaseService.rpc('handle_customer_payment_fifo_atomic', {
      p_customer_id: id,
      p_amount: payload.amount,
      p_payment_date: paymentTimestampStr,
      p_notes: payload.notes || '',
      p_created_by: createdBy
    });

    if (error) throw error;
    return { success: true, data };
  }

  static async createCustomerAccount(email: string, fullName: string, customerId: string) {
    const id = randomUUID();
    const emailLower = email.trim().toLowerCase();
    const password_hash = await hashPassword('ResetPassword123');

    const { error: profileError } = await supabaseService.from('profiles').insert({
      id,
      full_name: fullName,
      role: 'customer',
      email: emailLower,
      personal_email: emailLower,
      password_hash,
    });

    if (profileError) throw profileError;

    const { error: linkError } = await supabaseService.from('customers').update({ user_id: id }).eq('id', customerId);

    if (linkError) throw linkError;

    return { id };
  }
}
