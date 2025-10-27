-- ============================================
-- Migration: add calendar_feed_token to professionals
-- ============================================

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS calendar_feed_token TEXT;

-- Backfill: generate a random token for existing professionals if null
UPDATE professionals
SET calendar_feed_token = encode(gen_random_bytes(16), 'hex')
WHERE calendar_feed_token IS NULL;

-- Optional: ensure uniqueness for tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_calendar_token ON professionals(calendar_feed_token);