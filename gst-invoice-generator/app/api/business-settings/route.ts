import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// GET - Retrieve business settings
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Call the database function to get settings
    const { data, error } = await supabase.rpc('get_business_settings');

    if (error) {
      console.error('Error getting business settings:', error);
      return NextResponse.json(
        { error: 'Failed to get business settings', details: error.message },
        { status: 500 }
      );
    }

    // The function returns an array, get the first (and only) row
    const settings = data && data.length > 0 ? data[0] : null;

    if (!settings) {
      // Return null if no settings exist (frontend will use defaults)
      return NextResponse.json(null);
    }

    return NextResponse.json({
      name: settings.name || '',
      legalName: settings.legal_name || '',
      address: settings.address || '',
      city: settings.city || '',
      state: settings.state || '',
      pincode: settings.pincode || '',
      email: settings.email || '',
      phone: settings.phone || '',
      gstin: settings.gstin || '',
      cin: settings.cin || undefined,
      pan: settings.pan || undefined,
      logoUrl: settings.logo_url || undefined,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Save business settings
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
      name,
      legalName,
      address,
      city,
      state,
      pincode,
      email,
      phone,
      gstin,
      cin,
      pan,
      logoUrl,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!legalName || typeof legalName !== 'string') {
      return NextResponse.json(
        { error: 'legalName is required and must be a string' },
        { status: 400 }
      );
    }

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'address is required and must be a string' },
        { status: 400 }
      );
    }

    if (!city || typeof city !== 'string') {
      return NextResponse.json(
        { error: 'city is required and must be a string' },
        { status: 400 }
      );
    }

    if (!state || typeof state !== 'string') {
      return NextResponse.json(
        { error: 'state is required and must be a string' },
        { status: 400 }
      );
    }

    if (!pincode || typeof pincode !== 'string') {
      return NextResponse.json(
        { error: 'pincode is required and must be a string' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'email is required and must be a string' },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'phone is required and must be a string' },
        { status: 400 }
      );
    }

    if (!gstin || typeof gstin !== 'string') {
      return NextResponse.json(
        { error: 'gstin is required and must be a string' },
        { status: 400 }
      );
    }

    // Call the database function to save settings
    const { data, error } = await supabase.rpc('save_business_settings', {
      p_name: name,
      p_legal_name: legalName,
      p_address: address,
      p_city: city,
      p_state: state,
      p_pincode: pincode,
      p_email: email,
      p_phone: phone,
      p_gstin: gstin,
      p_cin: cin || null,
      p_pan: pan || null,
      p_logo_url: logoUrl || null,
    });

    if (error) {
      console.error('Error saving business settings:', error);
      return NextResponse.json(
        { error: 'Failed to save business settings', details: error.message },
        { status: 500 }
      );
    }

    // The function returns an array, get the first (and only) row
    const savedSettings = data && data.length > 0 ? data[0] : null;

    if (!savedSettings) {
      return NextResponse.json(
        { error: 'Failed to save business settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings: {
        name: savedSettings.name || '',
        legalName: savedSettings.legal_name || '',
        address: savedSettings.address || '',
        city: savedSettings.city || '',
        state: savedSettings.state || '',
        pincode: savedSettings.pincode || '',
        email: savedSettings.email || '',
        phone: savedSettings.phone || '',
        gstin: savedSettings.gstin || '',
        cin: savedSettings.cin || undefined,
        pan: savedSettings.pan || undefined,
        logoUrl: savedSettings.logo_url || undefined,
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

