-- Harden RLS Policies for users and professionals
-- This script drops existing policies on these tables and recreates them
-- in a simplified, robust way to remove conflicts and helper dependencies.

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 1. CLEANUP: Drop existing policies and helper functions
-- ========================================

-- Drop all policies on public.users
DO $$DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users;';
    RAISE NOTICE 'Dropped policy % on users', r.policyname;
  END LOOP;
END$$;

-- Drop all policies on public.professionals
DO $$DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE tablename = 'professionals' AND schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.professionals;';
    RAISE NOTICE 'Dropped policy % on professionals', r.policyname;
  END LOOP;
END$$;

-- Drop helper functions (if they exist)
-- First, drop any policies anywhere that reference helper functions
DO $$DECLARE r RECORD; BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND (qual ILIKE '%is_admin%' OR qual ILIKE '%is_professional%')) OR
        (with_check IS NOT NULL AND (with_check ILIKE '%is_admin%' OR with_check ILIKE '%is_professional%'))
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped policy % on %.% due to helper reference', r.policyname, r.schemaname, r.tablename;
  END LOOP;
END$$;

-- Now drop helper functions safely
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_professional();

-- ========================================
-- 2. RECREATE: Simplified policies for public.users
-- ========================================

-- Allow authenticated users to read all users (needed for role-gating in app)
CREATE POLICY users_select_all
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Allow a user to update their own profile, but not role escalation
CREATE POLICY users_update_self
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role IN ('CLIENT','PROFESSIONAL','ADMIN'));

-- Admins can perform any command
-- IMPORTANT: avoid recursion by NOT using FOR ALL on users table.
-- Split admin privileges into non-SELECT commands so SELECT does not evaluate
-- an admin check that queries the same table.

-- Admins can UPDATE any user
CREATE POLICY users_admin_update
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'ADMIN'
    )
  );

-- Admins can INSERT users
CREATE POLICY users_admin_insert
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'ADMIN'
    )
  );

-- Professionals can INSERT clients (users with role = 'CLIENT')
CREATE POLICY users_professional_insert_clients
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'PROFESSIONAL'
    )
    AND role = 'CLIENT'
  );

-- Admins can DELETE users
CREATE POLICY users_admin_delete
  ON public.users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'ADMIN'
    )
  );

-- ========================================
-- 3. RECREATE: Simplified policies for public.professionals
-- ========================================

-- Allow authenticated users to read professionals (menu access uses allowed_tabs)
CREATE POLICY professionals_select_all
  ON public.professionals FOR SELECT
  TO authenticated
  USING (true);

-- Allow professionals to update their own record
CREATE POLICY professionals_update_self
  ON public.professionals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can perform any command
CREATE POLICY professionals_admin_all
  ON public.professionals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'ADMIN'
    )
  );

-- ========================================
-- 4. RECREATE: Minimal policies for public.services and public.appointments
-- ========================================

-- Services: allow read to authenticated; admin can do anything; owners can update
CREATE POLICY services_select_all
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY services_admin_all
  ON public.services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'ADMIN'
    )
  );

-- Professionals owning the service can update (match service.professional_id to professional.id of current user)
CREATE POLICY services_update_owner
  ON public.services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = public.services.professional_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = public.services.professional_id
        AND p.user_id = auth.uid()
    )
  );

-- Appointments: admin can do anything; client or linked professional can read/update
CREATE POLICY appointments_admin_all
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS me
      WHERE me.id = auth.uid() AND me.role = 'ADMIN'
    )
  );

CREATE POLICY appointments_select_client_or_professional
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    public.appointments.client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = public.appointments.professional_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY appointments_update_client_or_professional
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    public.appointments.client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = public.appointments.professional_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.appointments.client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = public.appointments.professional_id
        AND p.user_id = auth.uid()
    )
  );

COMMIT;

-- ========================================
-- Verification: list effective policies
-- ========================================
SELECT 'Final policies on public.users' AS scope;
SELECT policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users'
  ORDER BY policyname;

SELECT 'Final policies on public.professionals' AS scope;
SELECT policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'professionals'
  ORDER BY policyname;

SELECT 'Final policies on public.services' AS scope;
SELECT policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'services'
  ORDER BY policyname;

SELECT 'Final policies on public.appointments' AS scope;
SELECT policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'appointments'
  ORDER BY policyname;