import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // If Supabase is not configured, return error
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' },
        { status: 500 }
      );
    }

    // Call the database function to get next invoice number
    const { data, error } = await supabase.rpc('get_next_invoice_number');

    if (error) {
      console.error('Error getting next invoice number:', error);
      return NextResponse.json(
        { error: 'Failed to get next invoice number', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoiceNo: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

