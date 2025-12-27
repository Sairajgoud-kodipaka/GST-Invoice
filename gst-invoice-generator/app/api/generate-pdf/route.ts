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

// ✅ Helper to get invoice HTML by fetching from internal URL (avoids auth issues)
async function getInvoiceHTML(invoice: InvoiceData, baseUrl: string): Promise<string> {
  const dataParam = encodeURIComponent(JSON.stringify(invoice));
  const url = `${baseUrl}/invoice-render-ssr?data=${dataParam}`;
  
  console.log('🌐 Fetching invoice HTML from:', url.substring(0, 100) + '...');
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-Generator/1.0)',
      },
    });
    
    if (!response.ok) {
      // Check if we got redirected to Vercel's deployment protection login
      const responseText = await response.text();
      const finalUrl = response.url || url;
      if (finalUrl.includes('vercel.com/login') || responseText.includes('vercel.com/login')) {
        throw new Error(
          `Vercel Deployment Protection is enabled on this preview deployment. ` +
          `This is a Vercel platform feature (not your app code). ` +
          `Solutions: 1) Disable Deployment Protection in Vercel Dashboard → Project Settings → Deployment Protection, ` +
          `or 2) Set NEXT_PUBLIC_APP_URL to your production domain. ` +
          `Attempted URL: ${url.substring(0, 200)}`
        );
      }
      throw new Error(`Failed to fetch invoice HTML: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('✅ Invoice HTML fetched successfully (length:', html.length, 'chars)');
    return html;
  } catch (error: any) {
    console.error('❌ Failed to fetch invoice HTML:', error.message);
    throw error;
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
    
    // ✅ Get HTML via internal fetch (avoids auth issues)
    let html = await getInvoiceHTML(invoice, baseUrl);
    
    // ✅ Convert relative image paths to absolute URLs so Puppeteer can load them
    // Next.js serves files from public/ folder at root URL
    // Example: public/logo-Photoroom.png → /logo-Photoroom.png → https://your-domain.com/logo-Photoroom.png
    const imageUrlPattern = /src="(\/[^"]+)"/g;
    const convertedImages: string[] = [];
    
    html = html.replace(imageUrlPattern, (match, path) => {
      const absoluteUrl = `${baseUrl}${path}`;
      convertedImages.push(`${path} → ${absoluteUrl}`);
      return `src="${absoluteUrl}"`;
    });
    
    // Also handle srcset and other attributes
    html = html.replace(
      /srcset="(\/[^"]+)"/g,
      (match, path) => {
        const absoluteUrl = `${baseUrl}${path}`;
        return `srcset="${absoluteUrl}"`;
      }
    );
    
    if (convertedImages.length > 0) {
      console.log('🖼️ Converted image paths to absolute URLs:');
      convertedImages.forEach(img => console.log(`   ${img}`));
    }
    
    // Set HTML directly - much faster and avoids auth issues
    console.log('📄 Setting invoice HTML directly in page...');
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    console.log('✅ Invoice HTML set successfully');
    
    // ✅ Wait a bit for page to stabilize
    console.log('⏳ Waiting for page to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for React hydration by checking for Next.js hydration markers
    // and waiting for the invoice element to appear
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds max
    let elementFound = false;
    
    while (attempts < maxAttempts && !elementFound) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      // Check if invoice element exists
      const hasElement = await page.evaluate(() => {
        return !!(
          document.querySelector('.invoice-page') || 
          document.querySelector('.invoice-template')
        );
      });
      
      if (hasElement) {
        elementFound = true;
        console.log(`✅ Invoice element found after ${attempts * 500}ms`);
        break;
      }
      
      // Check for errors on the page
      if (attempts % 4 === 0) { // Every 2 seconds
        const hasError = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
          const bodyText = document.body.textContent || '';
          return errorElements.length > 0 || bodyText.includes('Invalid invoice') || bodyText.includes('No invoice data');
        });
        
        if (hasError) {
          const errorText = await page.evaluate(() => document.body.textContent?.substring(0, 200));
          console.error('⚠️ Error detected on page:', errorText);
          throw new Error(`Page shows error: ${errorText}`);
        }
      }
    }
    
    if (!elementFound) {
      console.log('⚠️ Invoice element not found after waiting, checking page state...');
    }
    
    // ✅ Check for invoice element (if not already found during hydration wait)
    if (!elementFound) {
      console.log('⏳ Invoice element not found during hydration, checking selectors...');
      
      const selectorTimeout = 5000; // 5 seconds
      
      // Strategy: Wait for element to exist in DOM (for PDF, we don't need it visible in viewport)
      const checkSelector = async (selector: string, timeout: number): Promise<boolean> => {
        try {
          // Wait for element to exist in DOM (no visibility requirement - PDF doesn't need viewport visibility)
          await page.waitForSelector(selector, {
            timeout: timeout,
          });
          // Verify it has content (basic sanity check)
          const hasContent = await page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            return el !== null && el.textContent && el.textContent.trim().length > 10;
          }, selector);
          return hasContent;
        } catch {
          return false;
        }
      };
      
      // Try .invoice-page first (preferred selector)
      console.log(`⏳ Checking for .invoice-page...`);
      elementFound = await checkSelector('.invoice-page', selectorTimeout);
      
      if (elementFound) {
        console.log('✅ Invoice element (.invoice-page) found');
      } else {
        // Fallback: try .invoice-template
        console.log('⚠️ .invoice-page not found, trying .invoice-template...');
        elementFound = await checkSelector('.invoice-template', selectorTimeout);
        
        if (elementFound) {
          console.log('✅ Invoice element (.invoice-template) found');
        }
      }
    }
    
    // Final check - if still not found, log debug info and throw error
    if (!elementFound) {
      console.error('❌ Invoice element not found after all attempts. Checking page content...');
      const pageInfo = await page.evaluate(() => {
        return {
          bodyHTML: document.body.innerHTML.substring(0, 1000),
          bodyText: document.body.textContent?.substring(0, 500),
          hasInvoicePage: !!document.querySelector('.invoice-page'),
          hasInvoiceTemplate: !!document.querySelector('.invoice-template'),
          readyState: document.readyState,
          allClasses: Array.from(document.querySelectorAll('[class]')).map(el => el.className).slice(0, 10),
        };
      });
      console.log('📄 Page info:', JSON.stringify(pageInfo, null, 2));
      throw new Error(`Invoice element not found. Tried .invoice-page and .invoice-template. Page may not have rendered correctly.`);
    }
    
    // ✅ Small additional wait to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
    // Priority: Use request origin (production URL) > NEXT_PUBLIC_APP_URL > VERCEL_URL (preview, may require auth)
    let appUrl: string;
    
    if (isVercel) {
      // First, try to use the request origin (this is the production URL if available)
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host');
      
      if (host && !host.includes('localhost')) {
        // Use the request host (production URL)
        appUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
        console.log('🌍 Using request origin (production URL):', appUrl);
      } else if (process.env.NEXT_PUBLIC_APP_URL) {
        // Use explicitly configured production URL
        appUrl = process.env.NEXT_PUBLIC_APP_URL;
        console.log('🌍 Using NEXT_PUBLIC_APP_URL:', appUrl);
      } else {
        // Fallback to VERCEL_URL (preview URL - may require authentication)
        const vercelUrl = process.env.VERCEL_URL;
        if (vercelUrl) {
          appUrl = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
          console.log('⚠️ Using VERCEL_URL (preview - may require auth):', appUrl);
        } else {
          // Last resort: construct from headers
          appUrl = `${protocol}://${host || 'localhost:3000'}`;
          console.log('🌍 Using constructed URL from headers:', appUrl);
        }
      }
    } else {
      // Local development
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
      appUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
      console.log('🌍 Using local URL:', appUrl);
    }
    
    console.log('🌍 Final base URL:', appUrl);

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
