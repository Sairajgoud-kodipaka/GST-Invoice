import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invoice IDs array is required' },
        { status: 400 }
      );
    }

    // First, update any orders that reference these invoices
    await supabase
      .from('orders')
      .update({ has_invoice: false, invoice_id: null })
      .in('invoice_id', ids);

    // Delete invoices from Supabase
    const { error } = await supabase
      .from('invoices')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error deleting invoices:', error);
      return NextResponse.json(
        { error: 'Failed to delete invoices', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


