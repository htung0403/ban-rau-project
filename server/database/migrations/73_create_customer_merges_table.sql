-- Create customer_merges table for audit trail of customer merge operations
CREATE TABLE IF NOT EXISTS public.customer_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.customers(id),
  target_id UUID NOT NULL REFERENCES public.customers(id),
  source_name VARCHAR(255) NOT NULL,
  source_data JSONB NOT NULL,
  affected_order_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  merged_by UUID NOT NULL REFERENCES public.profiles(id),
  merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  CONSTRAINT chk_no_self_merge CHECK (source_id != target_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_customer_merges_source ON public.customer_merges(source_id);
CREATE INDEX IF NOT EXISTS idx_customer_merges_target ON public.customer_merges(target_id);
CREATE INDEX IF NOT EXISTS idx_customer_merges_merged_at ON public.customer_merges(merged_at);