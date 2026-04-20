import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read supabase config from server/src/config/supabase.ts or just read .env
const envStr = fs.readFileSync(path.resolve('./server/.env'), 'utf8');
const supabaseUrl = envStr.match(/SUPABASE_URL=(.*)/)?.[1] || '';
const supabaseKey = envStr.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('import_orders')
    .select(`
      id,
      customers!import_orders_customer_id_fkey(name)
    `)
    .limit(1);
    
  console.log('Result:', data, error);
}

check();
