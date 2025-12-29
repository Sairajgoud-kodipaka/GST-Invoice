-- Migration: Update to Sequential Invoice Numbering
-- This migration updates the invoice number generation to use sequential numbering
-- instead of order-based mapping, ensuring invoice numbers increment sequentially
-- regardless of order numbers.

-- Update the get_next_invoice_number function to use sequential numbering
-- It will find the highest invoice number (by numeric value) and increment it
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  last_num INT;
  prefix TEXT;
  last_invoice_no TEXT;
  max_num INT := 0;
  invoice_record RECORD;
BEGIN
  -- Get prefix from invoice_settings
  SELECT prefix INTO prefix
  FROM get_invoice_settings()
  LIMIT 1;
  
  -- Default prefix if not found
  IF prefix IS NULL THEN
    prefix := 'O-/';
  END IF;
  
  -- Find the highest invoice number by extracting numeric part
  -- This ensures we get the actual highest number, not just the most recent
  FOR invoice_record IN
    SELECT invoice_no
    FROM invoices
    WHERE invoice_no LIKE prefix || '%'
  LOOP
    -- Extract numeric part from invoice number (e.g., "O-/3628" -> 3628)
    last_num := CAST(SUBSTRING(invoice_record.invoice_no FROM '(\d+)$') AS INT);
    
    -- Track the maximum number found
    IF last_num IS NOT NULL AND last_num > max_num THEN
      max_num := last_num;
      last_invoice_no := invoice_record.invoice_no;
    END IF;
  END LOOP;
  
  -- If no invoices exist, get starting number from settings
  IF last_invoice_no IS NULL THEN
    SELECT starting_number INTO last_num
    FROM get_invoice_settings()
    LIMIT 1;
    
    -- Default to 1 if no settings
    IF last_num IS NULL THEN
      last_num := 1;
    END IF;
    
    RETURN prefix || last_num::TEXT;
  END IF;
  
  -- Return next sequential number
  RETURN prefix || (max_num + 1)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Add a comment explaining the change
COMMENT ON FUNCTION get_next_invoice_number() IS 
'Returns the next sequential invoice number based on the highest existing invoice number. 
Uses the prefix from invoice_settings and finds the maximum numeric value, then increments by 1.
This ensures sequential numbering regardless of order numbers.';

