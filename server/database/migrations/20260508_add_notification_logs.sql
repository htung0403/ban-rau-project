-- Add notification_logs table to track all notification attempts
-- Also add notification tracking columns to delivery_orders

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'zalo_oa', -- 'zalo_oa', 'sms', 'email', etc.
  status VARCHAR(50) NOT NULL, -- 'sent', 'failed', 'skipped'
  recipient_phone VARCHAR(20),
  message_id VARCHAR(255), -- Provider-specific message ID for tracking
  image_count INT DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retry_count INT DEFAULT 0 -- Track manual or automatic retries
);

CREATE INDEX idx_notification_logs_delivery_id ON public.notification_logs(delivery_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);

-- Add notification tracking columns to delivery_orders
-- (only if they don't exist)
ALTER TABLE public.delivery_orders
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_delivery_orders_notification_sent ON public.delivery_orders(notification_sent);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at ON public.delivery_orders(created_at DESC);

-- RLS policies for notification_logs (adjust based on your auth model)
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view all notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role ILIKE '%admin%'
    )
  );

CREATE POLICY "Allow system to insert notification logs"
  ON public.notification_logs
  FOR INSERT
  WITH CHECK (TRUE); -- Allow backend to insert

COMMENT ON TABLE public.notification_logs IS 'Audit log for all notification attempts (Zalo, SMS, email, etc.)';
COMMENT ON COLUMN public.notification_logs.provider IS 'Notification provider: zalo_oa, sms, email';
COMMENT ON COLUMN public.notification_logs.status IS 'Send status: sent, failed, skipped';
COMMENT ON COLUMN public.notification_logs.recipient_phone IS 'Recipient phone number (may be normalized)';
COMMENT ON COLUMN public.notification_logs.message_id IS 'Provider-specific message ID for tracking and retries';
COMMENT ON COLUMN public.delivery_orders.notification_sent IS 'Flag: has a notification been sent for this delivery';
COMMENT ON COLUMN public.delivery_orders.notification_sent_at IS 'Timestamp of first successful notification send';
