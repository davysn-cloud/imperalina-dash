-- Add financial fields to existing tables

-- Create payment status enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'OVERDUE');
  END IF;
END $$;

-- Add payment fields to appointments table
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'PENDING' NOT NULL;
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add commission field to services table
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5, 2) DEFAULT 0.00 NOT NULL;

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_date ON appointments(payment_date);

-- Update existing appointments to have payment_amount equal to service price
UPDATE appointments 
SET payment_amount = services.price 
FROM services 
WHERE appointments.service_id = services.id 
AND appointments.payment_amount IS NULL;