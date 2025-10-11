-- Enable DELETE on profiles for superadmins
-- The DELETE policy is already restricted by RLS policies to superadmins only

-- Add ON DELETE CASCADE to user_roles foreign key if not already set
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;