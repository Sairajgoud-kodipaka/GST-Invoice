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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Order IDs array is required' },
        { status: 400 }
      );
    }

    // Delete orders from Supabase
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error deleting orders:', error);
      return NextResponse.json(
        { error: 'Failed to delete orders', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


