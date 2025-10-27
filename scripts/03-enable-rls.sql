-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Admins can do everything with users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Professionals policies
CREATE POLICY "Anyone can view active professionals" ON professionals
  FOR SELECT USING (true);

CREATE POLICY "Professionals can update their own profile" ON professionals
  FOR UPDATE USING (
    user_id = auth.uid()::text
  );

CREATE POLICY "Admins can manage professionals" ON professionals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Services policies
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('ADMIN', 'PROFESSIONAL')
  ));

CREATE POLICY "Professionals can manage their own services" ON services
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage all services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Schedules policies
CREATE POLICY "Anyone can view active schedules" ON schedules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Professionals can manage their own schedules" ON schedules
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage all schedules" ON schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Appointments policies
CREATE POLICY "Users can view their own appointments" ON appointments
  FOR SELECT USING (
    client_id = auth.uid()::text OR
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Clients can create appointments" ON appointments
  FOR INSERT WITH CHECK (
    client_id = auth.uid()::text
  );

CREATE POLICY "Clients can update their own pending appointments" ON appointments
  FOR UPDATE USING (
    client_id = auth.uid()::text AND status = 'PENDING'
  );

CREATE POLICY "Professionals can update their appointments" ON appointments
  FOR UPDATE USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage all appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );
