-- ============================================
-- FOLLOW UP - Post-appointment information
-- ============================================

-- Create enums for follow up
CREATE TYPE event_importance AS ENUM ('ROUTINE', 'IMPORTANT', 'VERY_IMPORTANT', 'CRITICAL');
CREATE TYPE service_quality AS ENUM ('POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT');

-- Follow Up table
CREATE TABLE appointment_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Service Context
  service_reason TEXT,
  event_date DATE,
  event_importance event_importance,
  
  -- Conversation Topics
  conversation_topics TEXT[] DEFAULT '{}',
  personal_milestones TEXT[] DEFAULT '{}',
  
  -- Follow-up Items
  follow_up_topics TEXT[] DEFAULT '{}',
  reminders TEXT[] DEFAULT '{}',
  
  -- Feedback
  client_satisfaction SMALLINT CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
  service_quality service_quality,
  client_feedback TEXT,
  
  -- Products
  products_used TEXT[] DEFAULT '{}',
  products_recommended TEXT[] DEFAULT '{}',
  
  -- Technical Notes
  technical_notes TEXT,
  next_service_suggestion TEXT,
  
  -- Profile Updates
  profile_updates JSONB,
  
  -- Control
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_follow_ups_appointment ON appointment_follow_ups(appointment_id);
CREATE INDEX idx_follow_ups_completed_by ON appointment_follow_ups(completed_by);

-- Add trigger for updated_at
CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON appointment_follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
