-- Aura PWA Database Schema and RLS Policies

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  home_currency text DEFAULT 'CAD'::text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update their own profile"
ON public.profiles FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Shared Groups Table
CREATE TABLE IF NOT EXISTS public.shared_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  members uuid[] NOT NULL DEFAULT '{}'
);
ALTER TABLE public.shared_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups they are members of"
ON public.shared_groups FOR SELECT
TO authenticated
USING (auth.uid() = ANY(members));

CREATE POLICY "Users can create groups"
ON public.shared_groups FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.shared_groups(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  description text,
  category text,
  visibility text DEFAULT 'Private' CHECK (visibility IN ('Private', 'Shared')),
  currency text NOT NULL DEFAULT 'CAD'
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transaction RLS Policy: The "Wall"
-- Users can READ a transaction if they own it OR if it's Shared and they are in the group
CREATE POLICY "Users can select own or shared group transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR (
    visibility = 'Shared' 
    AND group_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.shared_groups 
      WHERE id = group_id 
      AND auth.uid() = ANY(members)
    )
  )
);

-- Users can INSERT their own transactions
CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can UPDATE their own transactions
CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can DELETE their own transactions
CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Trigger for Profile creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'name', 'User'), new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
