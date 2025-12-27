-- Create invoice_settings table to store invoice configuration
-- This table will have a single row that stores the current settings
-- The save_invoice_settings function ensures only one row exists
CREATE TABLE IF NOT EXISTS invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT NOT NULL DEFAULT 'O-/',
  starting_number INTEGER NOT NULL DEFAULT 1,
  auto_increment BOOLEAN NOT NULL DEFAULT true,
  default_payment_terms INTEGER NOT NULL DEFAULT 30,
  default_payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  starting_order_number INTEGER,
  starting_invoice_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get invoice settings (returns the single row)
CREATE OR REPLACE FUNCTION get_invoice_settings()
RETURNS TABLE (
  prefix TEXT,
  starting_number INTEGER,
  auto_increment BOOLEAN,
  default_payment_terms INTEGER,
  default_payment_method TEXT,
  starting_order_number INTEGER,
  starting_invoice_number INTEGER,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- If no settings exist, return defaults
  IF NOT EXISTS (SELECT 1 FROM invoice_settings) THEN
    RETURN QUERY SELECT 
      'O-/'::TEXT,
      1::INTEGER,
      true::BOOLEAN,
      30::INTEGER,
      'Bank Transfer'::TEXT,
      NULL::INTEGER,
      NULL::INTEGER,
      NOW()::TIMESTAMPTZ;
  ELSE
    RETURN QUERY SELECT 
      s.prefix,
      s.starting_number,
      s.auto_increment,
      s.default_payment_terms,
      s.default_payment_method,
      s.starting_order_number,
      s.starting_invoice_number,
      s.updated_at
    FROM invoice_settings s
    ORDER BY s.updated_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to save/update invoice settings
CREATE OR REPLACE FUNCTION save_invoice_settings(
  p_prefix TEXT,
  p_starting_number INTEGER,
  p_auto_increment BOOLEAN,
  p_default_payment_terms INTEGER,
  p_default_payment_method TEXT,
  p_starting_order_number INTEGER DEFAULT NULL,
  p_starting_invoice_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
  prefix TEXT,
  starting_number INTEGER,
  auto_increment BOOLEAN,
  default_payment_terms INTEGER,
  default_payment_method TEXT,
  starting_order_number INTEGER,
  starting_invoice_number INTEGER,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check if settings exist
  SELECT id INTO v_id FROM invoice_settings LIMIT 1;
  
  IF v_id IS NULL THEN
    -- Insert new settings
    INSERT INTO invoice_settings (
      prefix,
      starting_number,
      auto_increment,
      default_payment_terms,
      default_payment_method,
      starting_order_number,
      starting_invoice_number
    ) VALUES (
      p_prefix,
      p_starting_number,
      p_auto_increment,
      p_default_payment_terms,
      p_default_payment_method,
      p_starting_order_number,
      p_starting_invoice_number
    )
    RETURNING id INTO v_id;
  ELSE
    -- Update existing settings
    UPDATE invoice_settings SET
      prefix = p_prefix,
      starting_number = p_starting_number,
      auto_increment = p_auto_increment,
      default_payment_terms = p_default_payment_terms,
      default_payment_method = p_default_payment_method,
      starting_order_number = p_starting_order_number,
      starting_invoice_number = p_starting_invoice_number,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;
  
  -- Return the updated settings
  RETURN QUERY SELECT 
    s.prefix,
    s.starting_number,
    s.auto_increment,
    s.default_payment_terms,
    s.default_payment_method,
    s.starting_order_number,
    s.starting_invoice_number,
    s.updated_at
  FROM invoice_settings s
  WHERE s.id = v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get invoice number based on order number using the mapping
CREATE OR REPLACE FUNCTION get_invoice_number_from_order(order_no_param TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_starting_order_number INTEGER;
  v_starting_invoice_number INTEGER;
  v_order_num INTEGER;
  v_order_diff INTEGER;
  v_invoice_num INTEGER;
  v_order_match TEXT;
BEGIN
  -- Get current settings
  SELECT 
    prefix,
    starting_order_number,
    starting_invoice_number
  INTO 
    v_prefix,
    v_starting_order_number,
    v_starting_invoice_number
  FROM get_invoice_settings() LIMIT 1;
  
  -- Extract numeric part from order number (e.g., "MAN-25-5239" -> 5239)
  v_order_match := SUBSTRING(order_no_param FROM '(\d+)(?!.*\d)');
  
  IF v_order_match IS NULL THEN
    -- If no number found, return default
    RETURN v_prefix || (SELECT starting_number FROM get_invoice_settings() LIMIT 1)::TEXT;
  END IF;
  
  v_order_num := CAST(v_order_match AS INTEGER);
  
  -- If mapping is configured, use it
  IF v_starting_order_number IS NOT NULL AND v_starting_invoice_number IS NOT NULL THEN
    v_order_diff := v_order_num - v_starting_order_number;
    v_invoice_num := v_starting_invoice_number + v_order_diff;
    RETURN v_prefix || v_invoice_num::TEXT;
  END IF;
  
  -- Fall back to starting number
  RETURN v_prefix || (SELECT starting_number FROM get_invoice_settings() LIMIT 1)::TEXT;
END;
$$ LANGUAGE plpgsql;

