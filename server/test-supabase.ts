import { supabaseService } from './src/config/supabase'; supabaseService.from('delivery_orders').select('id').limit(1).then(console.log).catch(console.error);
