import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// These should be set as environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Using localStorage fallback.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Types
export interface SupabaseInvoice {
  id: string;
  invoice_no: string;
  order_no: string;
  invoice_date: string;
  order_date?: string;
  customer_name?: string;
  total_amount?: number;
  invoice_data?: any;
  created_at: string;
  created_by?: string;
  updated_at: string;
}




