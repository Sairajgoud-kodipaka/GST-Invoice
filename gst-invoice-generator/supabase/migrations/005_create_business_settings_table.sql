-- Create business_settings table to store business configuration
-- This table will have a single row that stores the current business details
-- Similar to invoice_settings, this is a singleton table

CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  gstin TEXT NOT NULL,
  cin TEXT,
  pan TEXT,
  logo_url TEXT, -- Base64 or URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get business settings (returns the single row)
CREATE OR REPLACE FUNCTION get_business_settings()
RETURNS TABLE (
  name TEXT,
  legal_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  cin TEXT,
  pan TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- If no settings exist, return NULL (frontend will use defaults)
  IF NOT EXISTS (SELECT 1 FROM business_settings) THEN
    RETURN;
  ELSE
    RETURN QUERY SELECT 
      s.name,
      s.legal_name,
      s.address,
      s.city,
      s.state,
      s.pincode,
      s.email,
      s.phone,
      s.gstin,
      s.cin,
      s.pan,
      s.logo_url,
      s.updated_at
    FROM business_settings s
    ORDER BY s.updated_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to save/update business settings
CREATE OR REPLACE FUNCTION save_business_settings(
  p_name TEXT,
  p_legal_name TEXT,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_pincode TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_gstin TEXT,
  p_cin TEXT DEFAULT NULL,
  p_pan TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  name TEXT,
  legal_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  cin TEXT,
  pan TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check if settings exist
  SELECT id INTO v_id FROM business_settings LIMIT 1;
  
  IF v_id IS NULL THEN
    -- Insert new settings
    INSERT INTO business_settings (
      name,
      legal_name,
      address,
      city,
      state,
      pincode,
      email,
      phone,
      gstin,
      cin,
      pan,
      logo_url
    ) VALUES (
      p_name,
      p_legal_name,
      p_address,
      p_city,
      p_state,
      p_pincode,
      p_email,
      p_phone,
      p_gstin,
      p_cin,
      p_pan,
      p_logo_url
    )
    RETURNING id INTO v_id;
  ELSE
    -- Update existing settings
    UPDATE business_settings SET
      name = p_name,
      legal_name = p_legal_name,
      address = p_address,
      city = p_city,
      state = p_state,
      pincode = p_pincode,
      email = p_email,
      phone = p_phone,
      gstin = p_gstin,
      cin = p_cin,
      pan = p_pan,
      logo_url = p_logo_url,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;
  
  -- Return the updated settings
  RETURN QUERY SELECT 
    s.name,
    s.legal_name,
    s.address,
    s.city,
    s.state,
    s.pincode,
    s.email,
    s.phone,
    s.gstin,
    s.cin,
    s.pan,
    s.logo_url,
    s.updated_at
  FROM business_settings s
  WHERE s.id = v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

