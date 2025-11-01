-- Comprehensive Admin Debug
-- Use this in Supabase SQL Editor to verify session, IDs, RLS status and policies

-- 0) Show session user and auth uid
SELECT current_user AS session_user;
SELECT auth.uid() AS auth_uid;

-- 1) Check RLS enabled on core tables
SELECT 'users' AS table,
       c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname = 'users'
UNION ALL
SELECT 'professionals' AS table,
       c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname = 'professionals';

-- 2) Preview current policies on users and professionals
SELECT 'public.users' AS scope, policyname, roles, cmd, qual, with_check
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'
UNION ALL
SELECT 'public.professionals' AS scope, policyname, roles, cmd, qual, with_check
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'professionals'
ORDER BY scope, policyname;

-- 3) Check whether current user is ADMIN
SELECT u.id, u.email, u.role
  FROM public.users u
 WHERE u.id = auth.uid();

-- 4) Check public.auth synchronization by email/id
SELECT u.email,
       u.id       AS public_id,
       a.id       AS auth_id,
       (u.id = a.id) AS id_in_sync,
       u.role
  FROM public.users u
  LEFT JOIN auth.users a ON a.email = u.email
 ORDER BY u.email
 LIMIT 50;

-- 5) Check professional record for current user and allowed_tabs
SELECT p.id, p.user_id, p.allowed_tabs
  FROM public.professionals p
 WHERE p.user_id = auth.uid();

-- 6) Try reading users/professionals to confirm SELECT works under RLS
SELECT COUNT(*) AS total_users FROM public.users;
SELECT COUNT(*) AS total_professionals FROM public.professionals;

-- 7) Policy runtime sanity: can an ADMIN do ALL?
-- If the current session is ADMIN, these should succeed under the hardened policies.
-- (Run individually if needed; Supabase Editor may stop on errors.)
-- UPDATE public.users SET name = name WHERE id = auth.uid();
-- UPDATE public.professionals SET user_id = user_id WHERE user_id = auth.uid();

-- 8) Show any lingering helper functions
SELECT n.nspname, p.proname
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname IN ('is_admin','is_professional');