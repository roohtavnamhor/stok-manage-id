-- Add Stock In/Out Tracking Fields and Tables
--
-- 1. New Tables
--    - jenis_stok_masuk (Stock In Types)
--  
-- 2. Modified Tables
--    - stock_in: Add jenis_stok_masuk_id, plat_nomor, supir, no_surat_jalan, retur_cabang_id
--    - stock_out: Add plat_nomor, supir, no_surat_jalan
--
-- 3. Security
--    - Enable RLS on jenis_stok_masuk table with appropriate policies
--
-- 4. Seed Data
--    - Insert default stock in types and RETUR SUPPLIER

-- Create jenis_stok_masuk table
CREATE TABLE IF NOT EXISTS public.jenis_stok_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jenis_stok_masuk ENABLE ROW LEVEL SECURITY;

-- Add new columns to stock_in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_in' AND column_name = 'jenis_stok_masuk_id'
  ) THEN
    ALTER TABLE public.stock_in ADD COLUMN jenis_stok_masuk_id UUID REFERENCES public.jenis_stok_masuk(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_in' AND column_name = 'plat_nomor'
  ) THEN
    ALTER TABLE public.stock_in ADD COLUMN plat_nomor TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_in' AND column_name = 'supir'
  ) THEN
    ALTER TABLE public.stock_in ADD COLUMN supir TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_in' AND column_name = 'no_surat_jalan'
  ) THEN
    ALTER TABLE public.stock_in ADD COLUMN no_surat_jalan TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_in' AND column_name = 'retur_cabang_id'
  ) THEN
    ALTER TABLE public.stock_in ADD COLUMN retur_cabang_id UUID REFERENCES public.cabang(id);
  END IF;
END $$;

-- Add new columns to stock_out
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_out' AND column_name = 'plat_nomor'
  ) THEN
    ALTER TABLE public.stock_out ADD COLUMN plat_nomor TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_out' AND column_name = 'supir'
  ) THEN
    ALTER TABLE public.stock_out ADD COLUMN supir TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_out' AND column_name = 'no_surat_jalan'
  ) THEN
    ALTER TABLE public.stock_out ADD COLUMN no_surat_jalan TEXT;
  END IF;
END $$;

-- Policies for jenis_stok_masuk
CREATE POLICY "All authenticated users can view jenis stok masuk"
  ON public.jenis_stok_masuk FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Superadmins can insert jenis stok masuk"
  ON public.jenis_stok_masuk FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update jenis stok masuk"
  ON public.jenis_stok_masuk FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete jenis stok masuk"
  ON public.jenis_stok_masuk FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Seed data for jenis_stok_masuk
INSERT INTO public.jenis_stok_masuk (name, description)
VALUES 
  ('SUPPLIER', 'Stok masuk dari supplier'),
  ('RETUR KONSUMEN', 'Stok masuk dari retur konsumen'),
  ('RETUR CABANG', 'Stok masuk dari retur cabang')
ON CONFLICT DO NOTHING;

-- Add RETUR SUPPLIER to jenis_stok_keluar if not exists
INSERT INTO public.jenis_stok_keluar (name, description)
VALUES ('RETUR SUPPLIER', 'Barang keluar untuk diretur ke supplier')
ON CONFLICT DO NOTHING;

-- Add RUSAK to jenis_stok_keluar if not exists
INSERT INTO public.jenis_stok_keluar (name, description)
VALUES ('RUSAK', 'Barang keluar karena rusak')
ON CONFLICT DO NOTHING;