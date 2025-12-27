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
    const invoices = (data || []).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_no,
      orderNumber: inv.order_no,
      invoiceDate: inv.invoice_date,
      orderDate: inv.order_date || '',
      customerName: inv.customer_name || '',
      totalAmount: inv.total_amount ? parseFloat(inv.total_amount.toString()) : 0,
      invoiceData: inv.invoice_data || {},
      createdAt: inv.created_at,
      createdBy: inv.created_by || 'system',
      updatedAt: inv.updated_at,
    }));

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

