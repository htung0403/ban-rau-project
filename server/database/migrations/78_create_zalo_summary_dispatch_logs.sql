CREATE TABLE IF NOT EXISTS public.zalo_summary_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_type VARCHAR(20) NOT NULL CHECK (summary_type IN ('grocery', 'supplier', 'sender')),
  summary_date DATE NOT NULL,
  target_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  target_name VARCHAR(255),
  target_phone VARCHAR(30),
  public_link TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  message_id VARCHAR(255),
  triggered_by VARCHAR(20) NOT NULL DEFAULT 'scheduler' CHECK (triggered_by IN ('scheduler', 'manual')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_zalo_summary_dispatch_logs UNIQUE (summary_type, summary_date, target_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_zalo_summary_dispatch_logs_date_type
  ON public.zalo_summary_dispatch_logs(summary_date, summary_type);

CREATE INDEX IF NOT EXISTS idx_zalo_summary_dispatch_logs_target
  ON public.zalo_summary_dispatch_logs(target_customer_id);
