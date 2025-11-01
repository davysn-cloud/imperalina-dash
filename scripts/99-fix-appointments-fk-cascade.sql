-- Fix appointments foreign key to allow CASCADE deletion
-- This allows deleting professionals even when they have appointments

-- Drop the existing foreign key constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_professional_id_fkey;

-- Add the foreign key constraint with CASCADE deletion
ALTER TABLE appointments ADD CONSTRAINT appointments_professional_id_fkey 
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

-- Also fix service_id FK to CASCADE (in case services are deleted)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_service_id_fkey 
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;