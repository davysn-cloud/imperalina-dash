-- ============================================
-- Migration: add client_id to appointment_follow_ins and index
-- ============================================

-- 1) Add column as nullable first, to allow backfill
ALTER TABLE appointment_follow_ins
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES users(id);

-- 2) Backfill client_id from appointments
UPDATE appointment_follow_ins fi
SET client_id = a.client_id
FROM appointments a
WHERE fi.appointment_id = a.id
  AND fi.client_id IS NULL;

-- 3) Set NOT NULL after backfill
ALTER TABLE appointment_follow_ins
  ALTER COLUMN client_id SET NOT NULL;

-- 4) Create index on client_id
CREATE INDEX IF NOT EXISTS idx_follow_ins_client ON appointment_follow_ins(client_id);