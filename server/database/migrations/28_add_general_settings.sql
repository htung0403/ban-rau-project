CREATE TABLE IF NOT EXISTS public.general_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.general_settings (setting_key, setting_value, description)
VALUES ('base_location', '{"lat": 10.8231, "lng": 106.6297, "radius": 50}', 'Vị trí gốc chấm công (vĩ độ, kinh độ, bán kính bằng mét)')
ON CONFLICT (setting_key) DO NOTHING;
