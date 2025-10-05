-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'user');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for secure role checking
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create cabang (branch) table
CREATE TABLE IF NOT EXISTS public.cabang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cabang ENABLE ROW LEVEL SECURITY;

-- Create jenis_stok_keluar (outbound stock type) table
CREATE TABLE IF NOT EXISTS public.jenis_stok_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jenis_stok_keluar ENABLE ROW LEVEL SECURITY;

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  variant TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create stock_in table
CREATE TABLE IF NOT EXISTS public.stock_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  source_id UUID REFERENCES public.cabang(id) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stock_in ENABLE ROW LEVEL SECURITY;

-- Create stock_out table
CREATE TABLE IF NOT EXISTS public.stock_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  destination_id UUID REFERENCES public.cabang(id) NOT NULL,
  jenis_id UUID REFERENCES public.jenis_stok_keluar(id) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stock_out ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Cabang policies (all authenticated users can view, only superadmin can modify)
CREATE POLICY "All authenticated users can view cabang"
  ON public.cabang FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Superadmins can insert cabang"
  ON public.cabang FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update cabang"
  ON public.cabang FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete cabang"
  ON public.cabang FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Jenis stok keluar policies (all authenticated users can view, only superadmin can modify)
CREATE POLICY "All authenticated users can view jenis stok keluar"
  ON public.jenis_stok_keluar FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Superadmins can insert jenis stok keluar"
  ON public.jenis_stok_keluar FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update jenis stok keluar"
  ON public.jenis_stok_keluar FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete jenis stok keluar"
  ON public.jenis_stok_keluar FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Products policies (users see their own, superadmin sees all)
CREATE POLICY "Users can view their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can delete their own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

-- Stock in policies (users see their own, superadmin sees all)
CREATE POLICY "Users can view their own stock in"
  ON public.stock_in FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert their own stock in"
  ON public.stock_in FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock in"
  ON public.stock_in FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can delete their own stock in"
  ON public.stock_in FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

-- Stock out policies (users see their own, superadmin sees all)
CREATE POLICY "Users can view their own stock out"
  ON public.stock_out FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert their own stock out"
  ON public.stock_out FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock out"
  ON public.stock_out FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can delete their own stock out"
  ON public.stock_out FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::app_role
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::app_role
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed data for cabang
INSERT INTO public.cabang (name) VALUES
  ('SUPPLIER'),
  ('AL-FATIH'),
  ('CIGADUNG')
ON CONFLICT DO NOTHING;

-- Seed data for jenis_stok_keluar
INSERT INTO public.jenis_stok_keluar (name, description) VALUES
  ('PENJUALAN', 'Barang keluar untuk dijual'),
  ('PEMAKAIAN', 'Barang keluar untuk dipakai internal')
ON CONFLICT DO NOTHING;