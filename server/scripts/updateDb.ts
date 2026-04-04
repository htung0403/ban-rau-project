import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function run() {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS is_custom_amount BOOLEAN DEFAULT false;
      
      CREATE OR REPLACE FUNCTION public.sync_import_order_totals()
      RETURNS TRIGGER AS $$
      DECLARE
          v_total NUMERIC := 0;
          v_is_custom BOOLEAN;
      BEGIN
          SELECT is_custom_amount INTO v_is_custom
          FROM public.import_orders
          WHERE id = COALESCE(NEW.import_order_id, OLD.import_order_id);

          IF v_is_custom THEN
              RETURN NULL;
          END IF;

          SELECT COALESCE(SUM(total_amount), 0) INTO v_total 
          FROM public.import_order_items 
          WHERE import_order_id = COALESCE(NEW.import_order_id, OLD.import_order_id);
          
          UPDATE public.import_orders 
          SET total_amount = v_total,
              debt_amount = v_total
          WHERE id = COALESCE(NEW.import_order_id, OLD.import_order_id);
          
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `
  });
  if (error) console.error('Error:', error);
  else console.log('Successfully updated DB schema and trigger');
}
run();
