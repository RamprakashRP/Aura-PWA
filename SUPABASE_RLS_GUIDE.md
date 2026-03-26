# Supabase Lockdown Protocol: Enabling Row Level Security (RLS)

To prevent data leakage between different users, you must enable **Row Level Security (RLS)** in your Supabase project. This ensures that even if someone manages to bypass the frontend code, the database itself will refuse to show User A's data to User B.

### 🛠 Step 1: Open the SQL Editor
Go to your **Supabase Dashboard** -> **SQL Editor** (on the left sidebar).

### 🛠 Step 2: Run the Lockdown Script
Copy and paste the following SQL into the editor and click **Run**:

```sql
-- 1. Enable RLS on the transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 2. Create a Policy: Users can only SEE their own transactions
CREATE POLICY "Users can only see their own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Create a Policy: Users can only INSERT their own transactions
CREATE POLICY "Users can only insert their own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Create a Policy: Users can only UPDATE their own transactions
CREATE POLICY "Users can only update their own transactions" 
ON transactions FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. Create a Policy: Users can only DELETE their own transactions
CREATE POLICY "Users can only delete their own transactions" 
ON transactions FOR DELETE 
USING (auth.uid() = user_id);
```

### 🛠 Step 3: Verify the Policy
1. Go to **Table Editor** -> `transactions`.
2. You should see an "RLS" badge in the top right corner indicating it is **Enabled**.
3. Now, even if User B logs in, they will only see transactions where the `user_id` matches their own unique Supabase ID.

---

### ⚠️ Note on Existing Data
If you have transactions in the database that were uploaded *before* we linked them to `user_id`, they might not have a `user_id` attached. You might want to run the `Wipe All Records` button in the Upload Center once to start fresh with a clean, isolated ledger.
