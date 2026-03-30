-- migration: products and inventory management

-- 1. Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- e.g. kg, thùng, bao, kiện
  category VARCHAR(100),
  base_price NUMERIC(15,2) DEFAULT 0,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create inventory table (stock levels per warehouse)
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, product_id)
);

-- 3. Modify import_orders to include product_id
ALTER TABLE public.import_orders ADD COLUMN product_id UUID REFERENCES public.products(id);

-- 4. Modify export_orders to include product_id and warehouse_id
ALTER TABLE public.export_orders ADD COLUMN product_id UUID REFERENCES public.products(id);
ALTER TABLE public.export_orders ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);

-- 5. Modify delivery_orders to include product_id
ALTER TABLE public.delivery_orders ADD COLUMN product_id UUID REFERENCES public.products(id);

-- 6. Trigger for updated_at in products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
