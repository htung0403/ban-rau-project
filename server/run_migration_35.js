require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('=== Migration 35: Delivery Status Workflow ===\n');

  // Step 1: Create a temporary helper function to run DDL
  console.log('Step 1: Creating temporary exec_ddl function...');
  const createFunc = await fetch(process.env.SUPABASE_URL + '/rest/v1/', {
    method: 'GET',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  
  // Use the Supabase SQL API (v2) endpoint
  const sqlEndpoint = process.env.SUPABASE_URL.replace('.supabase.co', '.supabase.co') + '/rest/v1/rpc/';
  
  // Alternative: Use the management API to run SQL
  // Try to find if we can use the management token
  
  // Actually, the simplest approach: use Supabase Edge Function or direct pg
  // Since we can't run DDL through PostgREST, let's try the Supabase Management API
  
  const projectRef = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  console.log('Project ref:', projectRef);
  
  // Try the Supabase Management API SQL endpoint
  const migrationSQL = `
    ALTER TABLE public.delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_status_check;
    ALTER TABLE public.delivery_orders ADD CONSTRAINT delivery_orders_status_check CHECK (status IN ('hang_o_sg', 'can_giao', 'da_giao', 'pending', 'in_progress', 'completed'));
    UPDATE public.delivery_orders SET status = 'hang_o_sg' WHERE status = 'pending';
    UPDATE public.delivery_orders SET status = 'can_giao' WHERE status = 'in_progress';
    UPDATE public.delivery_orders SET status = 'da_giao' WHERE status = 'completed';
    ALTER TABLE public.delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_status_check;
    ALTER TABLE public.delivery_orders ADD CONSTRAINT delivery_orders_status_check CHECK (status IN ('hang_o_sg', 'can_giao', 'da_giao'));
    ALTER TABLE public.delivery_orders ALTER COLUMN status SET DEFAULT 'hang_o_sg';
  `;

  // Method: Use the Supabase Management API
  // POST https://api.supabase.com/v1/projects/{ref}/database/query
  console.log('\nTrying Management API...');
  try {
    const mgmtResp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ query: migrationSQL })
    });
    const mgmtText = await mgmtResp.text();
    console.log('Management API response:', mgmtResp.status, mgmtText.substring(0, 200));
  } catch (e) {
    console.log('Management API error:', e.message);
  }

  // Verify current state
  console.log('\nVerifying current state...');
  const { data } = await sb.from('delivery_orders').select('id, status');
  if (data) {
    const statuses = {};
    data.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1; });
    console.log('Status distribution:', statuses);
  }
}

run().catch(console.error);
