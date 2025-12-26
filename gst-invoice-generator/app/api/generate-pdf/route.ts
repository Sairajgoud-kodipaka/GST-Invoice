import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { InvoiceData } from '@/app/types/invoice';

// Import puppeteer packages - use puppeteer for local (includes Chromium), puppeteer-core for Vercel
import puppeteerLocal from 'puppeteer';
import puppeteerCore from 'puppeteer-core';

// Helper function to safely close a page
async function safeClosePage(page: any) {
  try {
    if (page) {
      await page.close();
    }
  } catch (error: any) {
    if (error?.message && !error.message.includes('Target closed') && !error.message.includes('Connection closed')) {
      console.warn('Error closing page:', error);
    }
  }
}

// ✅ SIMPLE helper function to generate PDF for a single invoice (NO frame manipulation)
async function generateSinglePDF(
  browser: any,
  invoice: InvoiceData,
  baseUrl: string
): Promise<Buffer> {
  console.log(`📄 Generating PDF for invoice: ${invoice.metadata.invoiceNo}`);
  
  const page = await browser.newPage();
  
  try {
    // Set viewport
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });
    
    // ✅ Encode data in URL (NOT base64 - just JSON string)
    const dataParam = encodeURIComponent(JSON.stringify(invoice));
    const url = `${baseUrl}/invoice-render-ssr?data=${dataParam}`;
    
    console.log('🌐 Navigating to:', url.substring(0, 100) + '...');
    
    // ✅ Navigate with networkidle0 (wait for all network requests)
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });
    
    console.log('✅ Page loaded');
    
    // ✅ Wait for invoice element to be visible (try both selectors)
    try {
      await page.waitForSelector('.invoice-page', {
        visible: true,
        timeout: 15000,
      });
      console.log('✅ Invoice element (.invoice-page) found');
    } catch {
      // Fallback: try .invoice-template
      await page.waitForSelector('.invoice-template', {
        visible: true,
        timeout: 5000,
      });
      console.log('✅ Invoice element (.invoice-template) found');
    }
    
    // ✅ Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📄 Generating PDF...');
    
    // ✅ Generate PDF with small margin to prevent border clipping
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false, // Set to false to use explicit margins
      margin: { 
        top: '3mm',    // Small margin to ensure border is visible
        right: '3mm', 
        bottom: '3mm', 
        left: '3mm' 
      },
    });
    
    console.log('✅ PDF generated successfully');
    
    return Buffer.from(pdf);
    
  } finally {
    await safeClosePage(page);
  }
}

export async function POST(request: NextRequest) {
  let browser;
  
  try {
    const body = await request.json();
    const { invoices, single, batch, zip } = body;

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

    // Launch browser
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const puppeteer = (isVercel ? puppeteerCore : puppeteerLocal) as any;
    
    let launchOptions: any;

    if (isVercel) {
      const executablePath = await chromium.executablePath();
      if (!executablePath) {
        throw new Error('Chromium executable path not found.');
      }
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
        timeout: 30000,
      };
    } else {
      launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        timeout: 30000,
      };
    }

    browser = await puppeteer.launch(launchOptions);
    console.log('🚀 Browser launched');

    // Get base URL - handle both local and Vercel environments
    let appUrl: string;
    
    if (isVercel) {
      // On Vercel, use the deployment URL
      const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;
      if (vercelUrl) {
        // VERCEL_URL might not include protocol, add it if needed
        appUrl = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
      } else {
        // Fallback: construct from headers
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host') || 'localhost:3000';
        appUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
      }
    } else {
      // Local development
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
      appUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
    }
    
    console.log('🌍 Using base URL:', appUrl);

    // Handle batch merged PDF (multiple invoices in one PDF)
    if (batch && invoices.length > 1) {
      console.log(`📦 Generating batch merged PDF for ${invoices.length} invoices`);
      const pdfDoc = await PDFDocument.create();
      const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

      for (const invoice of invoices as InvoiceData[]) {
        const pdfBytes = await generateSinglePDF(browser, invoice, appUrl);
        const invoicePdf = await PDFDocument.load(pdfBytes);
        const pages = await pdfDoc.copyPages(invoicePdf, invoicePdf.getPageIndices());
        pages.forEach((page) => pdfDoc.addPage(page));
      }

      const mergedPdfBytes = await pdfDoc.save();
      const firstInvoice = invoices[0] as InvoiceData;
      const lastInvoice = invoices[invoices.length - 1] as InvoiceData;
      const firstInvoiceNo = sanitizeFilename(firstInvoice.metadata.invoiceNo || 'invoice');
      const lastInvoiceNo = sanitizeFilename(lastInvoice.metadata.invoiceNo || 'invoice');
      const filename = `Invoice_Batch_${firstInvoiceNo}_to_${lastInvoiceNo}_${invoices.length}_invoices.pdf`;

      return new NextResponse(mergedPdfBytes as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
    
    // Handle ZIP file (multiple invoices as separate PDFs in ZIP)
    else if (zip && invoices.length > 1) {
      console.log(`📦 Generating ZIP file for ${invoices.length} invoices`);
      const zipFile = new JSZip();
      const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

      for (const invoice of invoices as InvoiceData[]) {
        const pdfBytes = await generateSinglePDF(browser, invoice, appUrl);
        const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
        const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
        const filename = `Invoice_${invoiceNo}_${orderNo}.pdf`;
        zipFile.file(filename, pdfBytes);
      }

      const zipBuffer = await zipFile.generateAsync({ type: 'nodebuffer' });
      const dateStr = new Date().toISOString().split('T')[0];

      return new NextResponse(zipBuffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="Invoices-${dateStr}.zip"`,
        },
      });
    }
    
    // Handle single invoice PDF
    else {
      console.log('📄 Generating single invoice PDF');
      const invoice = invoices[0] as InvoiceData;
      const pdfBytes = await generateSinglePDF(browser, invoice, appUrl);
      
      const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');
      const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
      const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');

      return new NextResponse(pdfBytes as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Invoice_${invoiceNo}_${orderNo}.pdf"`,
        },
      });
    }
    
  } catch (error: any) {
    console.error('❌ PDF generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}
