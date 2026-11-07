/*
# Crear tablas del prototipo funcional de inventario

1. Nuevas tablas
- `inventory_products`: catálogo compartido de productos, con existencias actuales y umbral de alerta.
- `inventory_movements`: historial de entradas y salidas asociado a cada producto.

2. Integridad
- Cada movimiento referencia un producto existente.
- Las cantidades deben ser positivas.
- El tipo de movimiento solo puede ser entrada o salida.

3. Seguridad
- Se habilita RLS en ambas tablas.
- Como este prototipo académico no tiene inicio de sesión y representa una única microempresa, las operaciones CRUD se permiten a `anon` y `authenticated` sobre el espacio compartido.
- Se conceden únicamente los verbos necesarios para la interfaz.

4. Notas
- El cliente mantiene el stock y el historial como datos persistentes en Supabase.
- Los registros iniciales se crean desde la interfaz para que puedan demostrarse y modificarse durante la evaluación.
*/

CREATE TABLE IF NOT EXISTS public.inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'unidad',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock integer NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('entrada', 'salida')),
  quantity integer NOT NULL CHECK (quantity > 0),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_id_idx ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS inventory_movements_created_at_idx ON public.inventory_movements(created_at DESC);

ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO anon, authenticated;

DROP POLICY IF EXISTS "shared_select_inventory_products" ON public.inventory_products;
CREATE POLICY "shared_select_inventory_products" ON public.inventory_products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "shared_insert_inventory_products" ON public.inventory_products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_inventory_products" ON public.inventory_products;
CREATE POLICY "shared_update_inventory_products" ON public.inventory_products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "shared_delete_inventory_products" ON public.inventory_products FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_inventory_movements" ON public.inventory_movements;
CREATE POLICY "shared_select_inventory_movements" ON public.inventory_movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_inventory_movements" ON public.inventory_movements;
CREATE POLICY "shared_insert_inventory_movements" ON public.inventory_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_inventory_movements" ON public.inventory_movements;
CREATE POLICY "shared_update_inventory_movements" ON public.inventory_movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_inventory_movements" ON public.inventory_movements;
CREATE POLICY "shared_delete_inventory_movements" ON public.inventory_movements FOR DELETE TO anon, authenticated USING (true);