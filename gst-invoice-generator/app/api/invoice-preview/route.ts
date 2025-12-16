import { NextRequest, NextResponse } from 'next/server';

// This route redirects to the invoice-render page which uses InvoiceTemplate component
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dataParam = searchParams.get('data');
  
  if (!dataParam) {
    return new NextResponse('Missing invoice data', { status: 400 });
  }

  // Redirect to the page route that renders InvoiceTemplate
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  
  return NextResponse.redirect(`${baseUrl}/invoice-render?data=${encodeURIComponent(dataParam)}`);
}
