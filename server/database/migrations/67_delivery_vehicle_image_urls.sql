-- Ảnh chứng từ / xuất hàng gắn theo từng dòng phân xe (không chỉ cấp đơn giao).
ALTER TABLE public.delivery_vehicles
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
