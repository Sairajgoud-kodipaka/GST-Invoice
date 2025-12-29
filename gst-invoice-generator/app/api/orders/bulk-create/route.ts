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
    const { orders } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: 'Orders array is required' },
        { status: 400 }
      );
    }

    // Transform orders to Supabase format
    const ordersToInsert = orders.map((order: any) => ({
      order_no: order.orderNumber,
      order_date: order.orderDate,
      customer_name: order.customerName,
      total_amount: order.totalAmount,
      has_invoice: order.hasInvoice || false,
      invoice_id: order.invoiceId || null,
      order_data: order.invoiceData || {},
    }));

    // Upsert orders into Supabase (insert or update on conflict)
    // This handles duplicate orders by updating them instead of failing
    const { data, error } = await supabase
      .from('orders')
      .upsert(ordersToInsert, {
        onConflict: 'order_no',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Error creating orders:', error);
      return NextResponse.json(
        { error: 'Failed to create orders', details: error.message },
        { status: 500 }
      );
    }

    // Transform to match Order interface
    const createdOrders = (data || []).map((order) => ({
      id: order.id,
      orderNumber: order.order_no,
      orderDate: order.order_date,
      customerName: order.customer_name,
      totalAmount: parseFloat(order.total_amount.toString()),
      hasInvoice: order.has_invoice || false,
      invoiceId: order.invoice_id || undefined,
      invoiceData: order.order_data || {},
      createdAt: order.created_at,
    }));

    return NextResponse.json({ orders: createdOrders });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

