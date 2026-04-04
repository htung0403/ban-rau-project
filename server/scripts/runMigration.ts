import { createClient } from '@supabase/supabase-js';
import { env } from '../src/config/env';
import fs from 'fs';
import path from 'path';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    const sqlPath = path.resolve(__dirname, '../database/migrations/23_create_units_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Attempt to run the SQL via exec_sql
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.error('Migration failed:', error);
    } else {
      console.log('Migration successful: 23_create_units_table.sql');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
