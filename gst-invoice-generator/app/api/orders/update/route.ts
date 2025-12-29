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
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (updates.orderNumber !== undefined) updateData.order_no = updates.orderNumber;
    if (updates.orderDate !== undefined) updateData.order_date = updates.orderDate;
    if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
    if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount;
    if (updates.hasInvoice !== undefined) updateData.has_invoice = updates.hasInvoice;
    if (updates.invoiceId !== undefined) updateData.invoice_id = updates.invoiceId || null;
    if (updates.invoiceData !== undefined) updateData.order_data = updates.invoiceData;

    // Update order in Supabase
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Failed to update order', details: error.message },
        { status: 500 }
      );
    }

    // Transform to match Order interface
    const updatedOrder = {
      id: data.id,
      orderNumber: data.order_no,
      orderDate: data.order_date,
      customerName: data.customer_name,
      totalAmount: parseFloat(data.total_amount.toString()),
      hasInvoice: data.has_invoice || false,
      invoiceId: data.invoice_id || undefined,
      invoiceData: data.order_data || {},
      createdAt: data.created_at,
    };

    return NextResponse.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


