-- Đăng nhập qua API + bcrypt trên profiles; không còn FK tới auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN public.profiles.password_hash IS 'bcrypt ($2a$...); không lưu plaintext';
