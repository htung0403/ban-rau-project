import { supabaseService } from './src/config/supabase';

async function checkColumns() {
  const { data, error } = await supabaseService
    .from('attendance')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Select Error:', error);
  } else {
    console.log('Sample Row:', data);
  }

  const { data: cols, error: colError } = await supabaseService.rpc('get_table_columns', { table_name: 'attendance' });
  if (colError) {
    // If RPC doesn't exist, try raw query if possible (or just let us know)
    console.error('RPC Error:', colError);
  } else {
    console.log('Columns:', cols);
  }
}

checkColumns();
