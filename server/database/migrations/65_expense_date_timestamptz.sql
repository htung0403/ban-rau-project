-- 65_expense_date_timestamptz.sql
-- Lưu thời điểm chi phí kèm giờ (múi giờ VN cho dữ liệu cũ: 00:00)
ALTER TABLE public.expenses
  ALTER COLUMN expense_date TYPE TIMESTAMPTZ
  USING timezone('Asia/Ho_Chi_Minh', expense_date::timestamp);
