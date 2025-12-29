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
      .select('id, invoice_no, order_no, order_date, created_at, created_by')
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
      // Invoice already exists - check if it's for the same order (allow reuse/linking)
      if (existingInvoice.order_no === orderNo) {
        // Same order - update the invoice data instead of creating new one
        console.log(`Invoice ${invoiceNo} already exists for order ${orderNo} - updating invoice data`);
        
        // Use order date as invoice date if invoice date is today's date
        let invoiceDateToUse = finalInvoiceDate;
        if (orderDate) {
          // Helper function to format date as DD-MM-YYYY
          function formatDateForUpdate(dateStr: string): string {
            if (!dateStr) return '';
            // If already in DD-MM-YYYY format, return as is
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          }
          const today = new Date();
          const todayStr = formatDateForUpdate(today.toISOString());
          if (finalInvoiceDate === todayStr || !finalInvoiceDate) {
            invoiceDateToUse = orderDate;
          }
        }
        
        // Update invoice data metadata with correct invoice date
        invoiceData.metadata.invoiceDate = invoiceDateToUse;
        
        const finalInvoiceData = invoiceData;
        
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update({
            invoice_date: invoiceDateToUse,
            order_date: orderDate || existingInvoice.order_date || null,
            customer_name: customerName || null,
            total_amount: totalAmount || null,
            invoice_data: finalInvoiceData,
            updated_at: new Date().toISOString(),
          })
          .eq('invoice_no', invoiceNo)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating existing invoice:', updateError);
          return NextResponse.json(
            { error: 'Failed to update existing invoice', details: updateError.message },
            { status: 500 }
          );
        }

        // Update the order to mark it as having an invoice
        if (updatedInvoice) {
          const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
              has_invoice: true,
              invoice_id: updatedInvoice.id,
            })
            .eq('order_no', orderNo);

          if (updateOrderError) {
            console.warn('Failed to update order after invoice update:', updateOrderError);
          }
        }

        return NextResponse.json({
          success: true,
          invoice: updatedInvoice,
          updated: true, // Flag to indicate this was an update, not a new creation
        });
      } else {
        // Invoice exists for a DIFFERENT order - this is a conflict
        return NextResponse.json(
          {
            error: `Invoice number ${invoiceNo} already exists for order ${existingInvoice.order_no}. Cannot use duplicate invoice number for different order.`,
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
    }

    // Check if an invoice already exists for this order number (prevent regeneration)
    const { data: existingOrderInvoice, error: orderCheckError } = await supabase
      .from('invoices')
      .select('id, invoice_no, order_no, order_date, created_at, created_by')
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
      // Invoice already exists for this order number
      // If it's the same invoice number, allow update (re-import scenario)
      if (existingOrderInvoice.invoice_no === invoiceNo) {
        console.log(`Order ${orderNo} already has invoice ${invoiceNo} - updating invoice data`);
        
        // Use order date as invoice date if invoice date is today's date
        let invoiceDateToUse = finalInvoiceDate;
        if (orderDate) {
          // Helper function to format date as DD-MM-YYYY
          function formatDate(dateStr: string): string {
            if (!dateStr) return '';
            // If already in DD-MM-YYYY format, return as is
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          }
          const today = new Date();
          const todayStr = formatDate(today.toISOString());
          if (finalInvoiceDate === todayStr || !finalInvoiceDate) {
            invoiceDateToUse = orderDate;
          }
        }
        
        // Update invoice data metadata with correct invoice date
        invoiceData.metadata.invoiceDate = invoiceDateToUse;
        
        const finalInvoiceData = invoiceData;
        
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update({
            invoice_date: invoiceDateToUse,
            order_date: orderDate || existingOrderInvoice.order_date || null,
            customer_name: customerName || null,
            total_amount: totalAmount || null,
            invoice_data: finalInvoiceData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingOrderInvoice.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating existing invoice:', updateError);
          return NextResponse.json(
            { error: 'Failed to update existing invoice', details: updateError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          invoice: updatedInvoice,
          updated: true, // Flag to indicate this was an update, not a new creation
        });
      } else {
        // Order has a DIFFERENT invoice number - this is a conflict
        return NextResponse.json(
          {
            error: `Order ${orderNo} already has invoice ${existingOrderInvoice.invoice_no}. Cannot assign different invoice number ${invoiceNo}.`,
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

    // Use order date as invoice date if invoice date is not provided or is today's date
    // This ensures invoice date reflects when the order was created, not when invoice was generated
    let finalInvoiceDateToUse = finalInvoiceDate;
    if (orderDate) {
      // Helper function to format date as DD-MM-YYYY
      function formatDate(dateStr: string): string {
        if (!dateStr) return '';
        // If already in DD-MM-YYYY format, return as is
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Return original if invalid
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      
      // If order date is available, use it as invoice date (more accurate than today's date)
      // Only override if the invoice date seems to be today's date (to preserve explicit invoice dates from CSV)
      const today = new Date();
      const todayStr = formatDate(today.toISOString());
      if (finalInvoiceDate === todayStr || !finalInvoiceDate) {
        finalInvoiceDateToUse = orderDate;
      }
    }

    // Update metadata with correct invoiceDate
    invoiceData.metadata.invoiceDate = finalInvoiceDateToUse;
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
        invoice_date: finalInvoiceDateToUse,
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

