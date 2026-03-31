-- 1. Import Orders Related
CREATE INDEX IF NOT EXISTS idx_import_orders_customer_id ON public.import_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_import_orders_warehouse_id ON public.import_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_import_orders_received_by ON public.import_orders(received_by);
CREATE INDEX IF NOT EXISTS idx_import_orders_order_date ON public.import_orders(order_date DESC);

-- 2. Import Order Items Related
CREATE INDEX IF NOT EXISTS idx_import_order_items_order_id ON public.import_order_items(import_order_id);
CREATE INDEX IF NOT EXISTS idx_import_order_items_product_id ON public.import_order_items(product_id);

-- 3. Export Orders Related
CREATE INDEX IF NOT EXISTS idx_export_orders_customer_id ON public.export_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_export_orders_warehouse_id ON public.export_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_export_orders_product_id ON public.export_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_export_orders_created_by ON public.export_orders(created_by);

-- 4. Delivery Orders Related
CREATE INDEX IF NOT EXISTS idx_delivery_orders_import_order_id ON public.delivery_orders(import_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_product_id ON public.delivery_orders(product_id);

-- 5. Delivery Vehicles Related
CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_order_id ON public.delivery_vehicles(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_vehicle_id ON public.delivery_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_driver_id ON public.delivery_vehicles(driver_id);

-- 6. Vehicle Checkins Related
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_vehicle_id ON public.vehicle_checkins(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_driver_id ON public.vehicle_checkins(driver_id);
