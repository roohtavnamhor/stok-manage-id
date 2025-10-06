-- Add name column to profiles table
ALTER TABLE public.profiles ADD COLUMN name TEXT;

-- Add a comment to the column
COMMENT ON COLUMN public.profiles.name IS 'Display name of the user';