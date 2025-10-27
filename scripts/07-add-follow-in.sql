-- ============================================
-- FOLLOW IN - Pre-appointment information
-- ============================================

-- Create enum for client mood
CREATE TYPE client_mood AS ENUM ('VERY_HAPPY', 'HAPPY', 'NEUTRAL', 'TIRED', 'STRESSED', 'UPSET');

-- Follow In table
CREATE TABLE appointment_follow_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Client State on Arrival
  client_mood client_mood,
  arrived_on_time BOOLEAN,
  arrival_notes TEXT,
  
  -- Today's Specific Preferences
  coffee_today BOOLEAN,
  coffee_strength_today coffee_strength,
  music_today TEXT,
  temperature_today TEXT,
  
  -- Special Requests
  special_requests TEXT,
  time_constraints TEXT,
  
  -- Professional Notes
  professional_notes TEXT,
  
  -- Control
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_follow_ins_appointment ON appointment_follow_ins(appointment_id);
CREATE INDEX idx_follow_ins_completed_by ON appointment_follow_ins(completed_by);

-- Add trigger for updated_at
CREATE TRIGGER update_follow_ins_updated_at BEFORE UPDATE ON appointment_follow_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
