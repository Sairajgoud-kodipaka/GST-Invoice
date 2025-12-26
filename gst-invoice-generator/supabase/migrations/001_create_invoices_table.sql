-- Create invoices table with UNIQUE constraint on invoice_no
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  order_no TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  order_date TEXT,
  customer_name TEXT,
  total_amount NUMERIC,
  invoice_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on invoice_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Function to get next invoice number
-- Extracts number from format like "Q-MAN-25-101" and increments
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  last_num INT;
  prefix TEXT := 'Q-MAN-25-';
  last_invoice_no TEXT;
BEGIN
  -- Get the last invoice number
  SELECT invoice_no INTO last_invoice_no
  FROM invoices
  WHERE invoice_no LIKE prefix || '%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no invoices exist, start from 101
  IF last_invoice_no IS NULL THEN
    RETURN prefix || '101';
  END IF;
  
  -- Extract the numeric part (everything after the last dash)
  -- Handle formats like "Q-MAN-25-101" or "Q-MAN-25-105"
  last_num := CAST(SUBSTRING(last_invoice_no FROM '(\d+)$') AS INT);
  
  -- If extraction failed, default to 100 and add 1
  IF last_num IS NULL THEN
    last_num := 100;
  END IF;
  
  -- Return next number
  RETURN prefix || (last_num + 1)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to check if invoice number exists
CREATE OR REPLACE FUNCTION invoice_exists(invoice_no_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM invoices WHERE invoice_no = invoice_no_param
  );
END;
$$ LANGUAGE plpgsql;

