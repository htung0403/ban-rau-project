-- Thời điểm tài xế giao đủ (đơn chuyển sang da_giao), dùng cho giờ xuất thực tế
ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS driver_delivered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.delivery_orders.driver_delivered_at IS 'UTC: lần đầu đơn đạt da_giao; ưu tiên mốc delivered_at từ app (lúc bấm Lưu phân xe)';
