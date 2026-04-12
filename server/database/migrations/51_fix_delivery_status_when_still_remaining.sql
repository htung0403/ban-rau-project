-- Đơn đang da_giao nhưng tổng SL gán xe < SL đơn → sửa về can_giao (giao một phần).
UPDATE public.delivery_orders d
SET status = 'can_giao',
    updated_at = NOW()
WHERE d.status = 'da_giao'
  AND COALESCE(d.total_quantity, 0) > COALESCE(
    (SELECT SUM(dv.assigned_quantity) FROM public.delivery_vehicles dv WHERE dv.delivery_order_id = d.id),
    0
  );
