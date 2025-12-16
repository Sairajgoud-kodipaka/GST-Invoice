import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import JSZip from 'jszip';
import { InvoiceData } from '@/app/types/invoice';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoices, single } = body;

    if (!invoices || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: 'Invalid request: invoices array required' },
        { status: 400 }
      );
    }

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: at least one invoice is required' },
        { status: 400 }
      );
    }

    // Validate invoice structure
    for (const invoice of invoices) {
      if (!invoice.metadata || !invoice.metadata.invoiceNo || !invoice.metadata.orderNo) {
        return NextResponse.json(
          { error: 'Invalid invoice data: missing required metadata fields' },
          { status: 400 }
        );
      }
      if (!invoice.lineItems || !Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
        return NextResponse.json(
          { error: 'Invalid invoice data: missing or empty line items' },
          { status: 400 }
        );
      }
    }

    // Launch browser with timeout protection
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Browser launch timeout. Please try again.' },
          { status: 500 }
        );
      }
      throw error;
    }

    try {
      // Get base URL for invoice preview
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      if (single || invoices.length === 1) {
        // Generate single PDF
        const invoice = invoices[0] as InvoiceData;
        const page = await browser.newPage();
        
        // Encode invoice data and navigate to invoice render page (uses InvoiceTemplate component)
        const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
        try {
          await page.goto(`${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`, {
            waitUntil: 'networkidle0',
            timeout: 30000,
          });
        } catch (error) {
          await page.close();
          throw new Error(`Failed to load invoice page: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait a bit more to ensure all content is rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        });
        await page.close();

        return new NextResponse(pdf as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Invoice_${invoice.metadata.invoiceNo}_${invoice.metadata.orderNo}.pdf"`,
          },
        });
      } else {
        // Generate multiple PDFs and zip them
        const zip = new JSZip();

        for (const invoice of invoices as InvoiceData[]) {
          const page = await browser.newPage();
          const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
          
          await page.goto(`${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`, {
            waitUntil: 'networkidle0',
          });
          
          // Wait a bit more to ensure all content is rendered
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
          });
          
          const filename = `Invoice_${invoice.metadata.invoiceNo}_${invoice.metadata.orderNo}.pdf`;
          zip.file(filename, pdf);
          await page.close();
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(zipBuffer as any, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="invoices.zip"',
          },
        });
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
