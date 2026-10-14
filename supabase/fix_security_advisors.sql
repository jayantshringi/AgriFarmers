-- ==============================================================================
-- AgriFarmers: Supabase Security Advisor Fixes
-- Fixes:
--   1. rls_disabled_in_public (Error: public.users)
--   2. function_search_path_mutable (Warning: public.update_updated_at_column)
--
-- Instructions:
--   Copy and paste this script into your Supabase Dashboard -> SQL Editor and click 'Run'.
--   Then click 'Rerun linter' in the Security Advisor tab to verify both issues are resolved.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fix 'rls_disabled_in_public' on table public.users
-- ------------------------------------------------------------------------------
-- Enable Row Level Security (RLS) on public.users to prevent unauthorized
-- direct access via PostgREST / anon API key.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recommended: If your backend server (Vercel / Node.js) uses the
-- SUPABASE_SERVICE_ROLE_KEY, it automatically bypasses RLS and needs no policies.
-- 
-- If your backend or client uses the SUPABASE_ANON_KEY, uncomment the policies below
-- to allow the application to operate securely:

/*
-- Allow read access
CREATE POLICY "Allow read users"
ON public.users
FOR SELECT
USING (true);

-- Allow insert/upsert
CREATE POLICY "Allow insert users"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Allow update
CREATE POLICY "Allow update users"
ON public.users
FOR UPDATE
USING (true)
WITH CHECK (true);
*/


-- ------------------------------------------------------------------------------
-- 2. Fix 'function_search_path_mutable' on function update_updated_at_column
-- ------------------------------------------------------------------------------
-- Setting a fixed search_path prevents search_path hijacking attacks
-- flagged by Supabase Security Advisor (lint 0011).
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- ==============================================================================
