-- Aura PWA Database Schema and RLS Policies


-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  home_currency text DEFAULT 'CAD'::text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can search profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Allow authenticated users to search and discover registered friends
CREATE POLICY "Users can search profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert and update their own profile
CREATE POLICY "Users can update their own profile"
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


-- 4. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  budget_limit numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  UNIQUE (user_id, category)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budgets"
ON public.budgets FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- 5. Pending SMS Table (Ingestion Queue)
CREATE TABLE IF NOT EXISTS public.pending_sms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  visibility text DEFAULT 'Private' CHECK (visibility IN ('Private', 'Shared')),
  bank text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.pending_sms ENABLE ROW LEVEL SECURITY;

-- Anonymous webhooks from mobile devices can insert new uncommitted transactions
CREATE POLICY "Anyone can insert pending SMS alerts"
ON public.pending_sms FOR INSERT
WITH CHECK (true);

-- Authenticated users can read, update, or delete pending transactions belonging to them or unassigned
CREATE POLICY "Users can manage their own or unassigned pending SMS alerts"
ON public.pending_sms FOR ALL
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);


-- 6. Bank Accounts Table (Canadian Big 5 + Digital Banks, Chequing Waivers & HISA)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_id text,
  account_name text NOT NULL,
  account_type text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  last_4_digits text,
  monthly_fee numeric DEFAULT 0,
  min_balance_for_fee_waiver numeric DEFAULT 0,
  interest_rate_apy numeric DEFAULT 0,
  promo_interest_rate_apy numeric DEFAULT 0,
  promo_expiry_date text,
  statement_date_day integer,
  payment_due_date_day integer,
  credit_limit numeric,
  is_apple_pay boolean DEFAULT false,
  is_google_wallet boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bank accounts"
ON public.bank_accounts FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. Money Saver Vault Reminders & Deadlines
CREATE TABLE IF NOT EXISTS public.reminders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  reminder_type text NOT NULL DEFAULT 'credit_card',
  start_date text,
  renewal_date text NOT NULL,
  cancellation_deadline text,
  statement_date text,
  payment_due_date text,
  issuer_bank text,
  last_4_digits text,
  milestones jsonb DEFAULT '[]'::jsonb,
  estimated_savings numeric DEFAULT 0,
  action_url text,
  remind_days_before integer[] DEFAULT '{14,7,2,1}',
  amount numeric DEFAULT 0,
  currency text DEFAULT 'CAD',
  billing_cycle text DEFAULT 'monthly',
  auto_renew boolean DEFAULT true,
  status text DEFAULT 'active',
  last_reminded_at text,
  url text,
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reminders"
ON public.reminders FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 8. Biometric Passkeys (WebAuthn)
CREATE TABLE IF NOT EXISTS public.passkeys (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  device_type text DEFAULT 'platform',
  backed_up boolean DEFAULT true,
  credential_id text,
  public_key text,
  counter bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_used_at timestamp with time zone
);
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own passkeys"
ON public.passkeys FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 9. User Notification Settings (Telegram & Push)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_chat_id text,
  push_enabled boolean DEFAULT true,
  telegram_enabled boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification settings"
ON public.user_notifications FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 10. Contacts & Networking Directory
CREATE TABLE IF NOT EXISTS public.contacts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'unregistered' CHECK (status IN ('unregistered', 'pending', 'connected', 'rejected')),
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contacts"
ON public.contacts FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 11. Split Bills (Multi-Person or Roommate Expense Splits)
CREATE TABLE IF NOT EXISTS public.split_bills (
  id text PRIMARY KEY,
  creator_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  total_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  category text NOT NULL DEFAULT 'Groceries',
  date date NOT NULL DEFAULT CURRENT_DATE,
  payer_type text NOT NULL DEFAULT 'you',
  split_type text NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'exact', 'percentage')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.split_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own split bills"
ON public.split_bills FOR ALL
TO authenticated
USING (creator_user_id = auth.uid())
WITH CHECK (creator_user_id = auth.uid());

-- 12. Debt Entries (IOUs, Shares & Settlements Ledger)
CREATE TABLE IF NOT EXISTS public.debt_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id text NOT NULL,
  split_bill_id text,
  description text NOT NULL,
  amount numeric NOT NULL, -- Positive: they owe you; Negative: you owe them
  currency text NOT NULL DEFAULT 'CAD',
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL DEFAULT 'split_share' CHECK (type IN ('split_share', 'lent', 'borrowed', 'settlement')),
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'disputed', 'settled')),
  dispute_reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.debt_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their debt entries"
ON public.debt_entries FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- 13. Split Notifications (Cross-User Sync for Registered Aura Friends)
CREATE TABLE IF NOT EXISTS public.split_notifications (
  id text PRIMARY KEY,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  debt_entry_id text,
  title text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  type text NOT NULL DEFAULT 'split_bill',
  status text NOT NULL DEFAULT 'unread',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.split_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and respond to their incoming split notifications" ON public.split_notifications;
DROP POLICY IF EXISTS "Users manage notifications" ON public.split_notifications;

CREATE POLICY "Users manage notifications"
ON public.split_notifications FOR ALL
TO authenticated
USING (recipient_user_id = auth.uid() OR sender_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid() OR sender_user_id = auth.uid());
