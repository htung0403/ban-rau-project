import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const missingVars = _env.error.issues.map(i => i.path.join('.')).join(', ');
  console.error(`❌ Missing or invalid environment variables: ${missingVars}`);
  console.error('Please ensure all required environment variables are set in your .env file or Vercel project settings.');
  // In production (Vercel), we shouldn't exit as it kills the function, but instead return an error or handle it
  if (process.env.NODE_ENV === 'production') {
    console.error('SERVER STARTUP FAILED DUE TO MISSING ENV VARS');
  } else {
    process.exit(1);
  }
}

export const env = _env.data;
