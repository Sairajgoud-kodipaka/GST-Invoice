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
    const { id, updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (updates.invoiceNumber !== undefined) updateData.invoice_no = updates.invoiceNumber;
    if (updates.invoiceDate !== undefined) updateData.invoice_date = updates.invoiceDate;
    if (updates.orderNumber !== undefined) updateData.order_no = updates.orderNumber;
    if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
    if (updates.amount !== undefined) updateData.total_amount = updates.amount;
    if (updates.invoiceData !== undefined) updateData.invoice_data = updates.invoiceData;

    // Update invoice in Supabase
    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return NextResponse.json(
        { error: 'Failed to update invoice', details: error.message },
        { status: 500 }
      );
    }

    // Transform to match Invoice interface
    const invoiceData = data.invoice_data || {};
    const orderId = invoiceData.metadata?.orderNo || data.order_no || '';
    
    const updatedInvoice = {
      id: data.id,
      invoiceNumber: data.invoice_no || '',
      invoiceDate: data.invoice_date || '',
      orderNumber: data.order_no || '',
      orderId: orderId,
      customerName: data.customer_name || '',
      amount: data.total_amount ? parseFloat(data.total_amount.toString()) : 0,
      invoiceData: invoiceData,
      createdAt: data.created_at || new Date().toISOString(),
    };

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


