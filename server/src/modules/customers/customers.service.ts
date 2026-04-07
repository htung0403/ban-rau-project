import { supabaseService } from '../../config/supabase';

export class CustomerService {
  static async getAll(type?: string) {
    let query = supabaseService.from('customers').select('*');
    if (type) {
      query = query.eq('customer_type', type);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService.from('customers').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  static async getByUserId(userId: string) {
    const { data, error } = await supabaseService.from('customers').select('*').eq('user_id', userId).single();
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
    const { data, error } = await supabaseService.from('customers').insert(customerData).select().single();
    if (error) throw error;
    return data;
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
    // 1. Create Auth User
    const { data: authUser, error: authError } = await (supabaseService.auth as any).admin.createUser({
      email,
      password: 'ResetPassword123', // Default password
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;

    // 2. Create Profile
    const { error: profileError } = await supabaseService.from('profiles').insert({
      id: authUser.user.id,
      full_name: fullName,
      role: 'customer'
    });

    if (profileError) throw profileError;

    // 3. Link Profile to Customer
    const { error: linkError } = await supabaseService.from('customers').update({
      user_id: authUser.user.id
    }).eq('id', customerId);

    if (linkError) throw linkError;

    return authUser.user;
  }
}
