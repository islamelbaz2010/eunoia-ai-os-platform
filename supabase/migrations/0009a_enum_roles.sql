-- 0009a — PART 1 OF 2: Extend org_role enum
--
-- Run this FIRST in its own SQL Editor tab and wait for "Success" before
-- running 0009b. The new enum values must be committed before any table
-- or function can reference them.
--
-- Why separate: ALTER TYPE ADD VALUE cannot be used in the same transaction
-- as statements that USE the new value (PostgreSQL error 55P04).
-- Running this alone lets Supabase commit the new values before 0009b starts.
--
-- Apply: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new
-- Then open a NEW tab and run 0009b.

ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'manager'     AFTER  'admin';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'operator'    AFTER  'manager';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'editor'      AFTER  'operator';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'guest'       AFTER  'viewer';
