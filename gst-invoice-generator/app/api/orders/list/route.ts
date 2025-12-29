import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // If Supabase is not configured, return empty array
    if (!supabase) {
      return NextResponse.json({ orders: [] });
    }

    // Fetch all orders from Supabase, ordered by created_at descending
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: error.message },
        { status: 500 }
      );
    }

    // Transform Supabase data to match the Order interface
    const orders = (data || []).map((order) => {
      const orderData = order.order_data || {};
      
      return {
        id: order.id,
        orderNumber: order.order_no || '',
        orderDate: order.order_date || '',
        customerName: order.customer_name || '',
        totalAmount: order.total_amount ? parseFloat(order.total_amount.toString()) : 0,
        hasInvoice: order.has_invoice || false,
        invoiceId: order.invoice_id || undefined,
        invoiceData: orderData,
        createdAt: order.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


