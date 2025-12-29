-- Add unique constraint on order_no to prevent duplicate orders
-- This migration handles existing duplicates by keeping the first one
-- IMPORTANT: Run migration 003_create_orders_table.sql first!

-- Check if orders table exists before proceeding
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'orders'
  ) THEN
    RAISE EXCEPTION 'Orders table does not exist. Please run migration 003_create_orders_table.sql first!';
  END IF;
END $$;

-- First, remove any duplicate order_no entries (keep the oldest one)
-- Only if duplicates exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM orders
    GROUP BY order_no
    HAVING COUNT(*) > 1
  ) THEN
    DELETE FROM orders
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM orders
      GROUP BY order_no
    );
    RAISE NOTICE 'Removed duplicate orders, kept the oldest ones';
  END IF;
END $$;

-- Add unique constraint (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_order_no'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT unique_order_no UNIQUE (order_no);
    RAISE NOTICE 'Added unique constraint on order_no';
  ELSE
    RAISE NOTICE 'Unique constraint on order_no already exists';
  END IF;
END $$;

-- Create unique index for faster lookups (if not already exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no_unique ON orders(order_no);

