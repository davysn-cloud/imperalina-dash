-- Add is_active column to professionals table for permission management
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add can_manage_schedule column to track if professional can manage their own schedule
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS can_manage_schedule BOOLEAN DEFAULT true;

-- Add can_view_all_appointments column to track if professional can see all appointments
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS can_view_all_appointments BOOLEAN DEFAULT false;

-- Update RLS policies for professionals table
DROP POLICY IF EXISTS "Professionals viewable by authenticated users" ON professionals;
CREATE POLICY "Professionals viewable by authenticated users"
  ON professionals FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Professionals manageable by admins" ON professionals;
CREATE POLICY "Professionals manageable by admins"
  ON professionals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Professionals can update own profile" ON professionals;
CREATE POLICY "Professionals can update own profile"
  ON professionals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
