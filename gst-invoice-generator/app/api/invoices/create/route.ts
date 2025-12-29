import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceNo, orderNo, invoiceDate, orderDate, customerName, totalAmount, invoiceData } = body;

    // Validate required fields
    if (!invoiceNo || typeof invoiceNo !== 'string') {
      return NextResponse.json(
        { error: 'invoiceNo is required and must be a string' },
        { status: 400 }
      );
    }

    if (!orderNo || typeof orderNo !== 'string') {
      return NextResponse.json(
        { error: 'orderNo is required and must be a string' },
        { status: 400 }
      );
    }

    if (!invoiceDate || typeof invoiceDate !== 'string') {
      return NextResponse.json(
        { error: 'invoiceDate is required and must be a string' },
        { status: 400 }
      );
    }

    // If Supabase is not configured, return error
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' },
        { status: 500 }
      );
    }

    // First, check if invoice already exists
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, invoice_no, order_no, created_at, created_by')
      .eq('invoice_no', invoiceNo)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Error checking for existing invoice:', checkError);
      return NextResponse.json(
        { error: 'Failed to check for existing invoice', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingInvoice) {
      // Invoice already exists
      return NextResponse.json(
        {
          error: 'Invoice number already exists',
          exists: true,
          existingInvoice: {
            invoiceNo: existingInvoice.invoice_no,
            orderNo: existingInvoice.order_no,
            createdAt: existingInvoice.created_at,
            createdBy: existingInvoice.created_by || 'Unknown',
          },
        },
        { status: 409 } // Conflict status code
      );
    }

    // Check if an invoice already exists for this order number (prevent regeneration)
    const { data: existingOrderInvoice, error: orderCheckError } = await supabase
      .from('invoices')
      .select('id, invoice_no, order_no, created_at, created_by')
      .eq('order_no', orderNo)
      .single();

    if (orderCheckError && orderCheckError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Error checking for existing order invoice:', orderCheckError);
      return NextResponse.json(
        { error: 'Failed to check for existing order invoice', details: orderCheckError.message },
        { status: 500 }
      );
    }

    if (existingOrderInvoice) {
      // Invoice already exists for this order number - prevent regeneration
      return NextResponse.json(
        {
          error: `Order ${orderNo} already has invoice ${existingOrderInvoice.invoice_no}. Cannot regenerate invoices.`,
          exists: true,
          orderExists: true,
          existingInvoice: {
            invoiceNo: existingOrderInvoice.invoice_no,
            orderNo: existingOrderInvoice.order_no,
            createdAt: existingOrderInvoice.created_at,
            createdBy: existingOrderInvoice.created_by || 'Unknown',
          },
        },
        { status: 409 } // Conflict status code
      );
    }

    // Create the invoice
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        invoice_no: invoiceNo,
        order_no: orderNo,
        invoice_date: invoiceDate,
        order_date: orderDate || null,
        customer_name: customerName || null,
        total_amount: totalAmount || null,
        invoice_data: invoiceData || null,
        created_by: 'system', // Could be enhanced to track actual user
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        // This shouldn't happen since we checked above, but handle it anyway
        return NextResponse.json(
          {
            error: 'Invoice number already exists (race condition detected)',
            exists: true,
          },
          { status: 409 }
        );
      }

      console.error('Error creating invoice:', insertError);
      return NextResponse.json(
        { error: 'Failed to create invoice', details: insertError.message },
        { status: 500 }
      );
    }

    // Update the order to mark it as having an invoice
    if (newInvoice) {
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          has_invoice: true,
          invoice_id: newInvoice.id,
        })
        .eq('order_no', orderNo);

      if (updateOrderError) {
        console.warn('Failed to update order after invoice creation:', updateOrderError);
        // Don't fail the request, just log the warning
      }
    }

    return NextResponse.json({
      success: true,
      invoice: newInvoice,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

