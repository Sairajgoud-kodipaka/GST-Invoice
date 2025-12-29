import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceNo } = body;

    if (!invoiceNo || typeof invoiceNo !== 'string') {
      return NextResponse.json(
        { error: 'invoiceNo is required and must be a string' },
        { status: 400 }
      );
    }

    // If Supabase is not configured, return false (assume doesn't exist)
    if (!supabase) {
      return NextResponse.json({ exists: false });
    }

    // Check if invoice exists
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_no, order_no, created_at, created_by')
      .eq('invoice_no', invoiceNo)
      .single();

    if (error) {
      // If error is "PGRST116" (no rows returned), invoice doesn't exist
      if (error.code === 'PGRST116') {
        return NextResponse.json({ exists: false });
      }
      console.error('Error checking invoice existence:', error);
      return NextResponse.json(
        { error: 'Failed to check invoice existence', details: error.message },
        { status: 500 }
      );
    }

    // Invoice exists
    return NextResponse.json({
      exists: true,
      invoice: {
        invoiceNo: data.invoice_no,
        orderNo: data.order_no,
        createdAt: data.created_at,
        createdBy: data.created_by || 'Unknown',
      },
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}




