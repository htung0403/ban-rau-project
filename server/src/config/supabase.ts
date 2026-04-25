import { createClient } from '@supabase/supabase-js';
import fetch from 'cross-fetch';
import { env } from './env';

// Service role client bypasses RLS - use carefully for administrative tasks
export const supabaseService = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: { fetch }
  }
);

// Anon client for public or user-authenticated operations
export const supabaseAnon = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    global: { fetch }
  }
);

/**
 * Helper to get a Supabase client with the user's JWT
 * This is used for operations that must respect RLS
 */
export const getSupabaseUser = (token: string) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      },
      fetch
    }
  });
};
