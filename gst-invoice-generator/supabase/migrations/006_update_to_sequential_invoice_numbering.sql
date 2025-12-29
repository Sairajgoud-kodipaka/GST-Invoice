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
  max_num INT;
BEGIN
  -- Get prefix from invoice_settings
  -- Use table alias to avoid ambiguity with variable name
  SELECT s.prefix INTO prefix
  FROM get_invoice_settings() s
  LIMIT 1;
  
  -- Default prefix if not found
  IF prefix IS NULL THEN
    prefix := 'O-/';
  END IF;
  
  -- Find the highest invoice number by extracting numeric part using SQL aggregation
  -- IMPORTANT: This finds the MAXIMUM numeric value, NOT the most recent invoice
  -- This ensures sequential numbering continues from highest number even after deletions
  -- Example: If you have O-/3578 and delete O-/3579, O-/3580, next will be O-/3579
  SELECT MAX(CAST(SUBSTRING(invoice_no FROM '(\d+)$') AS INT))
  INTO max_num
  FROM invoices
  WHERE invoice_no LIKE prefix || '%'
    AND SUBSTRING(invoice_no FROM '(\d+)$') IS NOT NULL;
  
  -- If no invoices exist or max_num is NULL, get starting number from settings
  IF max_num IS NULL THEN
    SELECT s.starting_number INTO last_num
    FROM get_invoice_settings() s
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

