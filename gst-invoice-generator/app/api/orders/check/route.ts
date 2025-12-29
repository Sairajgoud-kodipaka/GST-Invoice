import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

interface OrderComparison {
  exists: boolean;
  isIdentical: boolean;
  existingOrder?: {
    id: string;
    orderNo: string;
    orderDate: string;
    customerName: string;
    totalAmount: number;
    hasInvoice: boolean;
    invoiceId?: string;
    orderData: any;
    createdAt: string;
    updatedAt: string;
  };
  differences?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { orderNo, orderDate, customerName, totalAmount, orderData } = body;

    if (!orderNo) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      );
    }

    // Check if order exists
    const { data: existingOrder, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_no', orderNo)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Error checking order:', error);
      return NextResponse.json(
        { error: 'Failed to check order', details: error.message },
        { status: 500 }
      );
    }

    if (!existingOrder) {
      // Order doesn't exist
      return NextResponse.json({
        exists: false,
        isIdentical: false,
      });
    }

    // Order exists - compare data
    const differences: { field: string; oldValue: any; newValue: any }[] = [];
    let isIdentical = true;

    // Compare order_date
    if (orderDate && existingOrder.order_date !== orderDate) {
      differences.push({
        field: 'orderDate',
        oldValue: existingOrder.order_date,
        newValue: orderDate,
      });
      isIdentical = false;
    }

    // Compare customer_name
    if (customerName && existingOrder.customer_name !== customerName) {
      differences.push({
        field: 'customerName',
        oldValue: existingOrder.customer_name,
        newValue: customerName,
      });
      isIdentical = false;
    }

    // Compare total_amount (with tolerance for floating point)
    if (totalAmount !== undefined) {
      const existingAmount = parseFloat(existingOrder.total_amount.toString());
      const newAmount = typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount);
      if (Math.abs(existingAmount - newAmount) > 0.01) {
        differences.push({
          field: 'totalAmount',
          oldValue: existingAmount,
          newValue: newAmount,
        });
        isIdentical = false;
      }
    }

    // Compare order_data (deep comparison of key fields)
    if (orderData) {
      const existingData = existingOrder.order_data || {};
      const newData = typeof orderData === 'string' ? JSON.parse(orderData) : orderData;

      // Compare financial status (important field that changes)
      const existingStatus = existingData?.metadata?.financialStatus || existingData?.financialStatus;
      const newStatus = newData?.metadata?.financialStatus || newData?.financialStatus;
      if (existingStatus !== newStatus) {
        differences.push({
          field: 'financialStatus',
          oldValue: existingStatus || 'N/A',
          newValue: newStatus || 'N/A',
        });
        isIdentical = false;
      }

      // Compare payment method
      const existingPayment = existingData?.metadata?.paymentMethod || existingData?.paymentMethod;
      const newPayment = newData?.metadata?.paymentMethod || newData?.paymentMethod;
      if (existingPayment !== newPayment) {
        differences.push({
          field: 'paymentMethod',
          oldValue: existingPayment || 'N/A',
          newValue: newPayment || 'N/A',
        });
        isIdentical = false;
      }

      // Compare line items count (simple check)
      const existingItems = existingData?.lineItems?.length || 0;
      const newItems = newData?.lineItems?.length || 0;
      if (existingItems !== newItems) {
        differences.push({
          field: 'lineItemsCount',
          oldValue: existingItems,
          newValue: newItems,
        });
        isIdentical = false;
      }

      // Compare total amount in order_data
      const existingDataTotal = existingData?.taxSummary?.totalAmountAfterTax || existingData?.totalAmount;
      const newDataTotal = newData?.taxSummary?.totalAmountAfterTax || newData?.totalAmount;
      if (existingDataTotal !== undefined && newDataTotal !== undefined) {
        if (Math.abs(existingDataTotal - newDataTotal) > 0.01) {
          differences.push({
            field: 'orderDataTotal',
            oldValue: existingDataTotal,
            newValue: newDataTotal,
          });
          isIdentical = false;
        }
      }
    }

    const result: OrderComparison = {
      exists: true,
      isIdentical,
      existingOrder: {
        id: existingOrder.id,
        orderNo: existingOrder.order_no,
        orderDate: existingOrder.order_date,
        customerName: existingOrder.customer_name,
        totalAmount: parseFloat(existingOrder.total_amount.toString()),
        hasInvoice: existingOrder.has_invoice || false,
        invoiceId: existingOrder.invoice_id || undefined,
        orderData: existingOrder.order_data,
        createdAt: existingOrder.created_at,
        updatedAt: existingOrder.updated_at,
      },
    };

    if (differences.length > 0) {
      result.differences = differences;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


