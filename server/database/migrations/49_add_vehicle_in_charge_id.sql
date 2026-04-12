ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS in_charge_id UUID REFERENCES public.profiles(id);
