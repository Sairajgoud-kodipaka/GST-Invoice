import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// GET - Retrieve invoice settings
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Call the database function to get settings
    const { data, error } = await supabase.rpc('get_invoice_settings');

    if (error) {
      console.error('Error getting invoice settings:', error);
      return NextResponse.json(
        { error: 'Failed to get invoice settings', details: error.message },
        { status: 500 }
      );
    }

    // The function returns an array, get the first (and only) row
    const settings = data && data.length > 0 ? data[0] : null;

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        prefix: 'O-/',
        startingNumber: 1,
        autoIncrement: true,
        defaultPaymentTerms: 30,
        defaultPaymentMethod: 'Bank Transfer',
        startingOrderNumber: undefined,
        startingInvoiceNumber: undefined,
      });
    }

    return NextResponse.json({
      prefix: settings.prefix || 'O-/',
      startingNumber: settings.starting_number || 1,
      autoIncrement: settings.auto_increment !== undefined ? settings.auto_increment : true,
      defaultPaymentTerms: settings.default_payment_terms || 30,
      defaultPaymentMethod: settings.default_payment_method || 'Bank Transfer',
      startingOrderNumber: settings.starting_order_number ?? undefined,
      startingInvoiceNumber: settings.starting_invoice_number ?? undefined,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Save invoice settings
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      prefix,
      startingNumber,
      autoIncrement,
      defaultPaymentTerms,
      defaultPaymentMethod,
      startingOrderNumber,
      startingInvoiceNumber,
    } = body;

    // Validate required fields
    if (!prefix || typeof prefix !== 'string') {
      return NextResponse.json(
        { error: 'prefix is required and must be a string' },
        { status: 400 }
      );
    }

    if (startingNumber === undefined || typeof startingNumber !== 'number' || startingNumber < 1) {
      return NextResponse.json(
        { error: 'startingNumber is required and must be a number >= 1' },
        { status: 400 }
      );
    }

    // Call the database function to save settings
    const { data, error } = await supabase.rpc('save_invoice_settings', {
      p_prefix: prefix,
      p_starting_number: startingNumber,
      p_auto_increment: autoIncrement !== undefined ? autoIncrement : true,
      p_default_payment_terms: defaultPaymentTerms || 30,
      p_default_payment_method: defaultPaymentMethod || 'Bank Transfer',
      p_starting_order_number: startingOrderNumber ?? null,
      p_starting_invoice_number: startingInvoiceNumber ?? null,
    });

    if (error) {
      console.error('Error saving invoice settings:', error);
      return NextResponse.json(
        { error: 'Failed to save invoice settings', details: error.message },
        { status: 500 }
      );
    }

    // The function returns an array, get the first (and only) row
    const savedSettings = data && data.length > 0 ? data[0] : null;

    if (!savedSettings) {
      return NextResponse.json(
        { error: 'Failed to retrieve saved settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        prefix: savedSettings.prefix,
        startingNumber: savedSettings.starting_number,
        autoIncrement: savedSettings.auto_increment,
        defaultPaymentTerms: savedSettings.default_payment_terms,
        defaultPaymentMethod: savedSettings.default_payment_method,
        startingOrderNumber: savedSettings.starting_order_number ?? undefined,
        startingInvoiceNumber: savedSettings.starting_invoice_number ?? undefined,
      },
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



