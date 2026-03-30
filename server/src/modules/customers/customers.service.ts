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
    // 1. Fetch all unpaid/partially paid export orders for this customer, ordered by oldest
    const { data: unpaidOrders, error: fetchError } = await supabaseService
      .from('export_orders')
      .select('*')
      .eq('customer_id', id)
      .neq('payment_status', 'paid')
      .order('export_date', { ascending: true })
      .order('created_at', { ascending: true });
      
    if (fetchError) throw fetchError;

    let remainingAmount = payload.amount;
    
    // 2. Distribute payment to old orders (FIFO)
    if (unpaidOrders && unpaidOrders.length > 0) {
      for (const order of unpaidOrders) {
        if (remainingAmount <= 0) break;
        
        const orderDebt = order.debt_amount || 0;
        const currentPaid = order.paid_amount || 0;
        const unpaidForOrder = orderDebt - currentPaid;
        
        if (unpaidForOrder <= 0) continue;
        
        const paymentForThisOrder = Math.min(unpaidForOrder, remainingAmount);
        const newPaidAmount = currentPaid + paymentForThisOrder;
        
        let newStatus = 'unpaid';
        if (newPaidAmount >= orderDebt) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }
        
        // Update this order
        await supabaseService
          .from('export_orders')
          .update({
            paid_amount: newPaidAmount,
            payment_status: newStatus
          })
          .eq('id', order.id);
          
        remainingAmount -= paymentForThisOrder;
      }
    }

    // 3. Decrease customer debt
    const { data, error } = await supabaseService.rpc('increment_customer_debt', {
      cust_id: id,
      amount: -payload.amount
    });
    // Fallback if RPC not exists:
    if (error) {
       const { data: customer } = await supabaseService.from('customers').select('debt').eq('id', id).single();
       const newDebt = (customer?.debt || 0) - payload.amount;
       await supabaseService.from('customers').update({ debt: newDebt }).eq('id', id);
    }

    // 4. Record to receipts table
    const paymentDate = payload.payment_date || new Date().toISOString().split('T')[0];
    await supabaseService.from('receipts').insert({
      customer_id: id,
      amount: payload.amount,
      payment_date: paymentDate,
      notes: payload.notes || '',
      created_by: userId
    });

    return { success: true };
  }

  static async createCustomerAccount(email: string, fullName: string, customerId: string) {
    // 1. Create Auth User
    const { data: authUser, error: authError } = await supabaseService.auth.admin.createUser({
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
