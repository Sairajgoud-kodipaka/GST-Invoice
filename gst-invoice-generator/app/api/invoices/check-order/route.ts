import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// Check if an order already has an invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNo } = body;

    if (!orderNo || typeof orderNo !== 'string') {
      return NextResponse.json(
        { error: 'orderNo is required and must be a string' },
        { status: 400 }
      );
    }

    // If Supabase is not configured, return false (assume doesn't exist)
    if (!supabase) {
      return NextResponse.json({ hasInvoice: false });
    }

    // Check if invoice exists for this order
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_no, order_no, created_at, created_by')
      .eq('order_no', orderNo)
      .single();

    if (error) {
      // If error is "PGRST116" (no rows returned), order doesn't have invoice
      if (error.code === 'PGRST116') {
        return NextResponse.json({ hasInvoice: false });
      }
      console.error('Error checking order invoice:', error);
      return NextResponse.json(
        { error: 'Failed to check order invoice', details: error.message },
        { status: 500 }
      );
    }

    // Order has an invoice
    return NextResponse.json({
      hasInvoice: true,
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



