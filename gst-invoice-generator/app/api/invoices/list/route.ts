import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // If Supabase is not configured, return empty array
    if (!supabase) {
      return NextResponse.json({ invoices: [] });
    }

    // Fetch all invoices from Supabase, ordered by created_at descending
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices', details: error.message },
        { status: 500 }
      );
    }

    // Transform Supabase data to match the Invoice interface
    const invoices = (data || []).map((inv) => {
      // Extract orderId from invoice_data if available, otherwise use order_no
      const invoiceData = inv.invoice_data || {};
      const orderId = invoiceData.metadata?.orderNo || inv.order_no || '';
      
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_no || '',
        invoiceDate: inv.invoice_date || '',
        orderNumber: inv.order_no || '',
        orderId: orderId,
        customerName: inv.customer_name || '',
        amount: inv.total_amount ? parseFloat(inv.total_amount.toString()) : 0,
        invoiceData: invoiceData,
        createdAt: inv.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

