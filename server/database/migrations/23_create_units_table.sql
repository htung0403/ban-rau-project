CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (optional, depends on setup, ignoring for now as other tables don't enforce strictly or use default policies)
-- But we can insert defaults
INSERT INTO public.units (name) VALUES 
('Két'), 
('Bị'), 
('Thùng'), 
('Hộp'), 
('Bao'), 
('Kg')
ON CONFLICT (name) DO NOTHING;
