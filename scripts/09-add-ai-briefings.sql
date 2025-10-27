-- ============================================
-- AI BRIEFINGS - Generated dossiers
-- ============================================

-- Create enum for WhatsApp status
CREATE TYPE whatsapp_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- AI Briefings table
CREATE TABLE ai_briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id),
  client_id UUID NOT NULL REFERENCES users(id),
  
  -- Generated Content
  briefing_content TEXT NOT NULL,
  briefing_summary TEXT,
  
  -- Structured Information
  key_topics TEXT[] DEFAULT '{}',
  preferences JSONB,
  last_visit_summary TEXT,
  suggested_topics TEXT[] DEFAULT '{}',
  
  -- Alerts and Reminders
  alerts TEXT[] DEFAULT '{}',
  reminders TEXT[] DEFAULT '{}',
  
  -- WhatsApp Control
  sent_at TIMESTAMPTZ,
  sent_via_whatsapp BOOLEAN DEFAULT false,
  whatsapp_message_id TEXT,
  whatsapp_status whatsapp_status,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Professional Feedback
  was_helpful BOOLEAN,
  professional_feedback TEXT,
  
  -- Generation Metadata
  ai_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  tokens_used INTEGER,
  generation_time INTEGER,
  
  generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_briefings_appointment ON ai_briefings(appointment_id);
CREATE INDEX idx_briefings_professional ON ai_briefings(professional_id);
CREATE INDEX idx_briefings_client ON ai_briefings(client_id);
CREATE INDEX idx_briefings_sent_at ON ai_briefings(sent_at);

-- Add trigger for updated_at
CREATE TRIGGER update_briefings_updated_at BEFORE UPDATE ON ai_briefings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
