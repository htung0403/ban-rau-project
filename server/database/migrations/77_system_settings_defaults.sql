-- Seed default system settings
INSERT INTO general_settings (setting_key, setting_value, description, updated_at) VALUES
('system_lock_schedule', '{"schedules":[]}'::jsonb, 'Khung giờ khóa hệ thống theo role', NOW()),
('inventory_transfer_rule', '{"mode":"hours_after_confirm","hours":24,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb, 'Chế độ chuyển hàng mới sang hàng cũ', NOW())
ON CONFLICT (setting_key) DO NOTHING;