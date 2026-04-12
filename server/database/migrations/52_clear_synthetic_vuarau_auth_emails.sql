-- =============================================================================
-- Xóa email giả dạng [chỉ_số]@vuarau.com khỏi Supabase Auth (auth.users).
-- Giữ nguyên tài khoản thật như admin_demo@vuarau.com, xe1@vuarau.com, ...
--
-- CHẠY TRÊN SUPABASE: SQL Editor → dán toàn bộ → chạy một lần (role postgres).
-- Sao lưu / kiểm tra staging trước khi chạy production.
--
-- ĐIỀU KIỆN: Mỗi nhân sự cần có public.profiles.phone hợp lệ (bước 1 dùng để gắn SĐT lên auth).
--
-- Thứ tự: (1) gắn phone E.164 từ public.profiles nếu auth chưa có phone
--         (2) xóa identity provider "email" (email giả)
--         (2b) thêm identity "phone" nếu thiếu — cần cho đăng nhập bằng SĐT
--         (3) xóa email + xác nhận email trên auth.users
--         (4) xóa cột public.profiles.email trùng pattern (nếu có)
--
-- Nếu bước (3) báo lỗi NOT NULL trên email: bản GoTrue của project không cho email NULL;
-- khi đó chỉ giữ bước (1)(2) hoặc xóa user qua Dashboard / API thay vì UPDATE email.
-- =============================================================================

-- (1) Điền phone trên auth từ hồ sơ — tránh mất đăng nhập sau khi bỏ email giả
UPDATE auth.users AS u
SET phone = CASE
  WHEN d.digits ~ '^0' AND length(d.digits) >= 10 THEN '+84' || substring(d.digits FROM 2)
  WHEN d.digits ~ '^84' THEN '+' || d.digits
  WHEN length(d.digits) >= 9 THEN '+' || d.digits
  ELSE u.phone
END,
    phone_confirmed_at = COALESCE(u.phone_confirmed_at, now())
FROM public.profiles AS p,
LATERAL (SELECT regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') AS digits) AS d
WHERE u.id = p.id
  AND btrim(COALESCE(p.phone, '')) <> ''
  AND d.digits <> ''
  AND u.email ~ '^[0-9]+@vuarau\.com$'
  AND (u.phone IS NULL OR btrim(u.phone) = '');

-- (2) Gỡ identity đăng nhập kiểu email (synthetic)
DELETE FROM auth.identities AS i
USING auth.users AS u
WHERE i.user_id = u.id
  AND i.provider = 'email'
  AND u.email ~ '^[0-9]+@vuarau\.com$';

-- (2b) Đảm bảo có identity phone (user chỉ có identity email trước đây sẽ không đăng nhập SĐT được)
INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
SELECT gen_random_uuid(),
       u.id,
       jsonb_build_object('sub', u.id::text, 'phone', u.phone),
       'phone',
       now(),
       now(),
       now(),
       u.phone
FROM auth.users u
WHERE u.phone IS NOT NULL
  AND btrim(u.phone) <> ''
  AND u.email ~ '^[0-9]+@vuarau\.com$'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'phone'
  );

-- (3) Bỏ email giả trên auth.users
UPDATE auth.users
SET email = NULL,
    email_confirmed_at = NULL
WHERE email ~ '^[0-9]+@vuarau\.com$';

-- (4) Đồng bộ public.profiles (cột email từng sync từ auth)
UPDATE public.profiles
SET email = NULL
WHERE email ~ '^[0-9]+@vuarau\.com$';
