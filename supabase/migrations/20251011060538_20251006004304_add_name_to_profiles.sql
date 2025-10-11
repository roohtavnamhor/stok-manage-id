-- Add name column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN name TEXT;
    COMMENT ON COLUMN public.profiles.name IS 'Display name of the user';
  END IF;
END $$;