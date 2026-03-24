# Aura PWA Implementation Plan

Aura is a high-performance Full-Stack PWA designed for personal finance tracking, specifically catering to a dual-user system (Ramprakash and Partner) with a joint shared household view. It features multi-currency normalization, an advanced failure-proof privacy engine, and a smart statement parser for automated categorization using ML Lite. The UI features a 'Solo Leveling' inspired aesthetic.

## User Review Required

- **Supabase MCP Usage:** I will need your assistance or confirmation when initializing Supabase resources via the Supabase MCP, or I can provide the SQL scripts for you to run.
- **Python Statement Parser Setup:** For PDF parsing (e.g., using `pdfplumber` or `PyPDF2`), it occasionally requires external system dependencies. The parser will now also use `thefuzz` for fuzzy string matching against historical categories.
- **ExchangeRate-API:** We will use a free API for currency normalization. Please ensure you are okay with fetching rates from a public API.

## Proposed Architecture

- **Frontend:** React 18 with Vite, TypeScript.
- **Styling:** Tailwind CSS (configured for a 'Solo Leveling' aesthetic: dark mode by default, sharp edges, glowing neon borders for active budgets, vibrant Google Green for healthy budgets, and desaturated grey for exceeded budgets).
- **Backend/BaaS:** Supabase (Auth, Postgres DB, Storage, RLS).
- **Icons & Charts:** `lucide-react` for iconography, `recharts` for financial visualizations.
- **PWA:** Managed utilizing `vite-plugin-pwa` for seamless manifest generation and service worker caching strategy.
- **Parser Skill:** Python scripts in `.agents/skills/statement-parser` using `thefuzz` for fuzzy text matching categorization based on user's past transaction data.

## Database Schema (Supabase)

### 1. `profiles`
- `id` (uuid, PK, references `auth.users`)
- `name` (text)
- `email` (text)
- `home_currency` (text, default 'CAD')

### 2. `shared_groups`
- `id` (uuid, PK)
- `name` (text, e.g., "Household")
- `members` (uuid array)

### 3. `transactions`
- `id` (uuid, PK)
- `user_id` (uuid, references `profiles`)
- `group_id` (uuid, nullable, references `shared_groups`)
- `amount` (numeric)
- `date` (date)
- `description` (text)
- `category` (text)
- `visibility` (text, default 'Private') *(Hardcoded default at DB level)*
- `currency` (text)

## Step-by-Step Implementation Strategy

### Phase 1: Project Scaffolding
- Initialize React Vite TS in `aura/`
- Install dependencies: `tailwindcss` (with custom theme extensions), `@supabase/supabase-js`, `lucide-react`, `recharts`, `react-router-dom`, `vite-plugin-pwa`.
- Set up Tailwind config for Solo Leveling styles (neon glows, sharp borders, high-energy progress bars).

### Phase 2: Advanced Privacy & Backend
- Generate Supabase SQL schema with `visibility` defaulting to `Private`.
- Define Strict Row Level Security policies (The "Wall"):
  - Policy strictly forbids `SELECT` action from a partner unless `visibility = 'Shared'` AND (`group_id` matches the partner's shared group).
  - Users can naturally read/write their own transactions regardless of visibility.

### Phase 3: Statement Parser Skill (Smart Mapper)
- Create `.agents/skills/statement-parser`.
- Write python script `parser.py` that ingests CSV/PDF, extracts Date, Amount, Note.
- Implement "Smart Mapper" using `thefuzz`: if a note is missing, use fuzzy matching on the description against historical transactions in the DB to automatically suggest categories (e.g., 'Zomato' -> 'Food').

### Phase 4: Frontend Development & Universal Ledger
- **Auth:** Login / Signup components connecting to Supabase Auth.
- **Dashboard (Universal Ledger):** Implement Currency Normalization using ExchangeRate-API. Convert foreign transactions to the user's `home_currency` on the fly so charts accurately reflect total spend.
- **UI:** Dual profile toggle, transaction grid, and progress bars reflecting budget health.
- **Upload Center:** File dropzone for processing integrating with the Smart Mapper.

### Phase 5: PWA & Deployment
- Configure `vite-plugin-pwa` (Icons, offline fallback).
- Prepare Netlify / Vercel configuration.

## Verification Plan

### Automated Verification
- Verify Vite build compiles perfectly.
- Validate Python statement parser against dummy CSV/PDF structure and test fuzzy matching logic.
- Check PWA manifest validation using Lighthouse rules locally.

### Manual Verification
- Deploy to Vercel/Netlify preview URL.
- Test "The Wall": Login with test accounts, verify RLS denies access to 'Private' transactions of the partner.
- Test "Universal Ledger": Add CAD and INR transactions and verify the ExchangeRate-API normalizes the total sum accurately.
