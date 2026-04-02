import { supabaseService } from './src/config/supabase';

async function test() {
  const query = supabaseService
    .from('payment_collections')
    .select(`
      *,
      delivery_orders ( id, import_orders ( order_code, customers ( name ) ) ),
      drivers:profiles!payment_collections_driver_id_fkey(full_name),
      receivers:profiles!payment_collections_receiver_id_fkey(full_name),
      vehicles ( license_plate )
    `)
    .order('collected_at', { ascending: false });
    
  const { data, error } = await query;
  if (error) {
    console.error('SUPABASE ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}

test();
