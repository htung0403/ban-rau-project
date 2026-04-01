import { supabaseService } from '../../config/supabase';

export class CustomerService {
  static async getAll() {
    const { data, error } = await supabaseService.from('customers').select('*');
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
     const { data, error } = await supabaseService
      .from('import_orders')
      .select('*')
      .eq('customer_id', id)
      .order('order_date', { ascending: false });
    if (error) throw error;
    return data;
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

  static async updateDebtPayment(id: string, payload: { amount: number, payment_date?: string, notes?: string }, userId?: string) {
    const paymentDate = payload.payment_date || new Date().toISOString().split('T')[0];
    
    // Call the atomic RPC function that handles receipt creation, ledger, and FIFO distribution
    const { data, error } = await supabaseService.rpc('handle_customer_payment_fifo_atomic', {
      p_customer_id: id,
      p_amount: payload.amount,
      p_payment_date: paymentDate,
      p_notes: payload.notes || '',
      p_created_by: userId
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
