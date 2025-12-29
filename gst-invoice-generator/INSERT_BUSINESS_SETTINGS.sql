-- ============================================
-- SQL COMMAND TO INSERT/UPDATE BUSINESS SETTINGS
-- ============================================
-- This uses the save_business_settings function which automatically
-- handles both INSERT (if no settings exist) and UPDATE (if settings exist)
--
-- MANGATRAI GEMS & JEWELS PRIVATE LIMITED
-- Business Settings from Tax Invoice
-- ============================================
SELECT * FROM save_business_settings(
  p_name := 'Pearls by Mangatrai',
  p_legal_name := 'Mangatrai Gems & Jewels Private Limited',
  p_address := 'Opp. Liberty Petrol pump, Basheer Bagh',
  p_city := 'Hyderabad',
  p_state := 'Telangana',
  p_pincode := '500063',
  p_email := 'sales@pearlsbymangatrai.com',
  p_phone := '+91 91000 09220',
  p_gstin := '36AAPCM2955G1Z4',
  p_cin := 'U36900TG2021PTC158093',
  p_pan := 'AAPCM2955G',
  p_logo_url := NULL
);

-- ============================================
-- ALTERNATIVE: DIRECT INSERT (Use only if table is empty)
-- ============================================
/*
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
  'Pearls by Mangatrai',
  'Mangatrai Gems & Jewels Private Limited',
  'Opp. Liberty Petrol pump, Basheer Bagh',
  'Hyderabad',
  'Telangana',
  '500063',
  'sales@pearlsbymangatrai.com',
  '+91 91000 09220',
  '36AAPCM2955G1Z4',
  'U36900TG2021PTC158093',
  'AAPCM2955G',
  NULL
);
*/

-- ============================================
-- VERIFY THE SETTINGS WERE SAVED:
-- ============================================
-- SELECT * FROM get_business_settings();

-- ============================================
-- ALTERNATIVE: UPDATE EXISTING SETTINGS
-- ============================================
-- Use this if settings already exist and you want to update them
/*
UPDATE business_settings SET
  name = 'Pearls by Mangatrai',
  legal_name = 'Mangatrai Gems & Jewels Private Limited',
  address = 'Opp. Liberty Petrol pump, Basheer Bagh',
  city = 'Hyderabad',
  state = 'Telangana',
  pincode = '500063',
  email = 'sales@pearlsbymangatrai.com',
  phone = '+91 91000 09220',
  gstin = '36AAPCM2955G1Z4',
  cin = 'U36900TG2021PTC158093',
  pan = 'AAPCM2955G',
  logo_url = NULL,
  updated_at = NOW()
WHERE id = (SELECT id FROM business_settings LIMIT 1);
*/

-- ============================================
-- TO DELETE EXISTING SETTINGS (if needed):
-- ============================================
-- DELETE FROM business_settings;

