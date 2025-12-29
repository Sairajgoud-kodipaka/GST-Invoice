import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both formats: direct fields OR invoiceData object
    let invoiceNo: string | undefined;
    let orderNo: string | undefined;
    let invoiceDate: string | undefined;
    let orderDate: string | undefined;
    let customerName: string | undefined;
    let totalAmount: number | undefined;
    let invoiceData: any | undefined;

    if (body.invoiceData && typeof body.invoiceData === 'object') {
      // Extract from invoiceData object (new format from SupabaseService)
      const data = body.invoiceData;
      invoiceNo = data.metadata?.invoiceNo;
      orderNo = data.metadata?.orderNo;
      invoiceDate = data.metadata?.invoiceDate;
      orderDate = data.metadata?.orderDate;
      customerName = data.billToParty?.name;
      totalAmount = data.taxSummary?.totalAmountAfterTax;
      invoiceData = data;
    } else {
      // Direct fields format (old format from invoiceService)
      invoiceNo = body.invoiceNo;
      orderNo = body.orderNo;
      invoiceDate = body.invoiceDate;
      orderDate = body.orderDate;
      customerName = body.customerName;
      totalAmount = body.totalAmount;
      invoiceData = body.invoiceData;
    }

    // Validate required fields with detailed error messages
    if (!invoiceNo || typeof invoiceNo !== 'string') {
      console.error('Invalid invoiceNo:', { invoiceNo, type: typeof invoiceNo, body: JSON.stringify(body).substring(0, 200) });
      return NextResponse.json(
        { error: 'invoiceNo is required and must be a string', received: invoiceNo, type: typeof invoiceNo },
        { status: 400 }
      );
    }

    if (!orderNo || typeof orderNo !== 'string') {
      console.error('Invalid orderNo:', { orderNo, type: typeof orderNo, body: JSON.stringify(body).substring(0, 200) });
      return NextResponse.json(
        { error: 'orderNo is required and must be a string', received: orderNo, type: typeof orderNo },
        { status: 400 }
      );
    }

    // invoiceDate is required - use orderDate as fallback, but fail if both are missing
    if (!invoiceDate || typeof invoiceDate !== 'string') {
      if (orderDate && typeof orderDate === 'string') {
        invoiceDate = orderDate; // Use order date if invoice date is missing
      } else {
        return NextResponse.json(
          { 
            error: 'invoiceDate is required. Order data is incomplete. Please re-import the order with complete date information.',
            received: invoiceDate,
            orderDate: orderDate
          },
          { status: 400 }
        );
      }
    }
    const finalInvoiceDate = invoiceDate;

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

    // Validate invoiceData structure - fail fast if incomplete
    if (!invoiceData || typeof invoiceData !== 'object') {
      return NextResponse.json(
        { 
          error: 'invoiceData is required and must be a complete InvoiceData object. Order data is incomplete. Please re-import the order.',
          received: invoiceData ? typeof invoiceData : 'missing'
        },
        { status: 400 }
      );
    }

    // Validate required InvoiceData structure
    const requiredFields = {
      metadata: invoiceData.metadata,
      business: invoiceData.business,
      billToParty: invoiceData.billToParty,
      shipToParty: invoiceData.shipToParty,
      lineItems: invoiceData.lineItems,
      taxSummary: invoiceData.taxSummary,
    };

    const missingFields: string[] = [];
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: `Invoice data is incomplete. Missing required fields: ${missingFields.join(', ')}. Please re-import the order with complete data.`,
          missingFields
        },
        { status: 400 }
      );
    }

    // Validate metadata structure
    if (!invoiceData.metadata.invoiceNo || !invoiceData.metadata.orderNo || !invoiceData.metadata.invoiceDate) {
      return NextResponse.json(
        { 
          error: 'Invoice metadata is incomplete. Missing required fields: invoiceNo, orderNo, or invoiceDate. Please re-import the order.',
          metadata: invoiceData.metadata
        },
        { status: 400 }
      );
    }

    // Ensure metadata values match the extracted values (data integrity check)
    if (invoiceData.metadata.invoiceNo !== invoiceNo || invoiceData.metadata.orderNo !== orderNo) {
      return NextResponse.json(
        { 
          error: 'Data integrity check failed. Invoice metadata does not match extracted values. Please re-import the order.',
          metadataInvoiceNo: invoiceData.metadata.invoiceNo,
          extractedInvoiceNo: invoiceNo,
          metadataOrderNo: invoiceData.metadata.orderNo,
          extractedOrderNo: orderNo
        },
        { status: 400 }
      );
    }

    // Update metadata with correct invoiceDate if it differs
    invoiceData.metadata.invoiceDate = finalInvoiceDate;
    if (orderDate) {
      invoiceData.metadata.orderDate = orderDate;
    }

    const finalInvoiceData = invoiceData;

    // Create the invoice
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        invoice_no: invoiceNo,
        order_no: orderNo,
        invoice_date: finalInvoiceDate,
        order_date: orderDate || null,
        customer_name: customerName || null,
        total_amount: totalAmount || null,
        invoice_data: finalInvoiceData,
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

