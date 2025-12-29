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
    const { order } = body;

    if (!order) {
      return NextResponse.json(
        { error: 'Order data is required' },
        { status: 400 }
      );
    }

    // Insert order into Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_no: order.orderNumber,
        order_date: order.orderDate,
        customer_name: order.customerName,
        total_amount: order.totalAmount,
        has_invoice: order.hasInvoice || false,
        invoice_id: order.invoiceId || null,
        order_data: order.invoiceData || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return NextResponse.json(
        { error: 'Failed to create order', details: error.message },
        { status: 500 }
      );
    }

    // Transform to match Order interface
    const createdOrder = {
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

    return NextResponse.json({ order: createdOrder });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


