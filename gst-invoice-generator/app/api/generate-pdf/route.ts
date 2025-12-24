import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { InvoiceData } from '@/app/types/invoice';

// Lazy load puppeteer based on environment
async function getPuppeteer() {
  // Check if we're in a serverless environment (Vercel sets VERCEL=1)
  const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
  const isServerless = isVercel || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  console.log('Environment detection:', {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    AWS_LAMBDA: process.env.AWS_LAMBDA_FUNCTION_NAME,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    isVercel,
    isServerless
  });
  
  // Always try serverless setup first if on Vercel
  if (isServerless) {
    try {
      console.log('Attempting to load puppeteer-core with @sparticuz/chromium...');
      // Use dynamic imports for better Next.js serverless compatibility
      const puppeteerModule = await import('puppeteer-core');
      const chromiumModule = await import('@sparticuz/chromium');
      
      const puppeteer = puppeteerModule.default || puppeteerModule;
      const chromium = chromiumModule.default || chromiumModule;
      
      // Configure chromium for serverless
      if (chromium.setGraphicsMode) {
        chromium.setGraphicsMode(false);
      }
      
      console.log('Successfully loaded puppeteer-core with @sparticuz/chromium');
      return { puppeteer, chromium };
    } catch (error) {
      console.error('Failed to load serverless puppeteer:', error);
      // Don't fall back - fail explicitly so we know what's wrong
      throw new Error(
        `Failed to load serverless puppeteer. ` +
        `Make sure @sparticuz/chromium and puppeteer-core are installed. ` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } else {
    // Local development - use regular puppeteer
    console.log('Using regular puppeteer for local development');
    try {
      const puppeteerModule = await import('puppeteer');
      const puppeteer = puppeteerModule.default || puppeteerModule;
      return { puppeteer, chromium: null };
    } catch (error) {
      throw new Error(
        `Failed to load puppeteer for local development. ` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoices, single, batch } = body;

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

    // Get puppeteer instance based on environment
    const { puppeteer, chromium } = await getPuppeteer();

    // Launch browser with timeout protection
    // Enhanced args for Vercel serverless environment
    let browser;
    try {
      if (chromium) {
        // Use serverless-compatible configuration
        let executablePath: string;
        try {
          executablePath = await chromium.executablePath();
          console.log('Chromium executable path resolved:', executablePath);
          
          // Verify the path exists (basic check)
          if (!executablePath || executablePath.length === 0) {
            throw new Error('Chromium executable path is empty');
          }
        } catch (pathError) {
          console.error('Failed to get Chromium executable path:', pathError);
          throw new Error(
            `Failed to resolve Chromium executable path: ${pathError instanceof Error ? pathError.message : 'Unknown error'}`
          );
        }
        
        console.log('Launching browser with Chromium...');
        browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-sandbox',
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
        console.log('Browser launched successfully with Chromium');
      } else {
        // Local development configuration
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
          ],
          timeout: 30000,
        });
        console.log('Browser launched successfully (local)');
      }
    } catch (error) {
      console.error('Browser launch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        chromium: chromium ? 'available' : 'not available'
      });
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Browser launch timeout. Please try again.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { 
          error: 'Failed to launch browser',
          details: errorMessage
        },
        { status: 500 }
      );
    }

    try {
      // Get base URL for invoice preview
      // On Vercel, use VERCEL_URL environment variable if available
      let baseUrl: string;
      if (process.env.VERCEL_URL) {
        // Vercel provides the deployment URL
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        // Fallback to headers or localhost
        const protocol = request.headers.get('x-forwarded-proto') || 
                        (request.url.startsWith('https') ? 'https' : 'http');
        const host = request.headers.get('host') || 
                    request.headers.get('x-forwarded-host') || 
                    'localhost:3000';
        baseUrl = `${protocol}://${host}`;
      }
      
      console.log('Base URL for invoice rendering:', baseUrl);

      if (batch && invoices.length > 1) {
        // Generate single PDF with multiple invoices (batch mode)
        const pdfDoc = await PDFDocument.create();
        const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

        for (const invoice of invoices as InvoiceData[]) {
          const page = await browser.newPage();
          await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels at 96 DPI
          const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
          
          const invoiceUrl = `${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`;
          console.log(`Navigating to invoice URL (length: ${invoiceUrl.length})`);
          
          try {
            await page.goto(invoiceUrl, {
              waitUntil: 'networkidle0',
              timeout: 30000,
            });
            console.log('Successfully loaded invoice page');
          } catch (error) {
            await page.close();
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to load invoice page:', errorMsg);
            throw new Error(`Failed to load invoice page: ${errorMsg}. URL: ${baseUrl}/invoice-render`);
          }
          
          // Wait a bit more to ensure all content is rendered
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Inject CSS to prevent blank pages
          await page.addStyleTag({
            content: `
              @media print {
                html, body {
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .invoice-template ~ * {
                  display: none !important;
                }
                body > div:empty {
                  display: none !important;
                  height: 0 !important;
                }
              }
            `
          });
          
          // Remove any empty elements that might cause blank pages
          await page.evaluate(() => {
            const body = document.body;
            if (body) {
              // Remove empty divs
              const allDivs = body.querySelectorAll('div');
              allDivs.forEach(div => {
                if (div.children.length === 0 && div.textContent?.trim() === '') {
                  div.remove();
                }
              });
              // Remove any elements after invoice template
              const invoiceTemplate = body.querySelector('.invoice-template');
              if (invoiceTemplate) {
                let nextSibling = invoiceTemplate.nextElementSibling;
                while (nextSibling) {
                  const toRemove = nextSibling;
                  nextSibling = nextSibling.nextElementSibling;
                  toRemove.remove();
                }
              }
            }
          });
          
          const pdfBytes = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
            preferCSSPageSize: true,
            displayHeaderFooter: false,
          });
          await page.close();

          // Merge this invoice PDF into the main document
          const invoicePdf = await PDFDocument.load(pdfBytes);
          const pages = await pdfDoc.copyPages(invoicePdf, invoicePdf.getPageIndices());
          pages.forEach((page) => pdfDoc.addPage(page));
        }

        const mergedPdfBytes = await pdfDoc.save();
        const invoiceCount = invoices.length;
        const firstInvoice = invoices[0] as InvoiceData;
        const lastInvoice = invoices[invoices.length - 1] as InvoiceData;
        const firstInvoiceNo = sanitizeFilename(firstInvoice.metadata.invoiceNo || 'invoice');
        const lastInvoiceNo = sanitizeFilename(lastInvoice.metadata.invoiceNo || 'invoice');
        const filename = invoiceCount === 1 
          ? `Invoice_${firstInvoiceNo}.pdf`
          : `Invoice_Batch_${firstInvoiceNo}_to_${lastInvoiceNo}_${invoiceCount}_invoices.pdf`;

        return new NextResponse(mergedPdfBytes as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } else if (single || invoices.length === 1) {
        // Generate single PDF
        const invoice = invoices[0] as InvoiceData;
        const page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels at 96 DPI
        
        // Encode invoice data and navigate to invoice render page (uses InvoiceTemplate component)
        const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
        const invoiceUrl = `${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`;
        console.log(`Navigating to invoice URL (length: ${invoiceUrl.length})`);
        
        try {
          await page.goto(invoiceUrl, {
            waitUntil: 'networkidle0',
            timeout: 30000,
          });
          console.log('Successfully loaded invoice page');
        } catch (error) {
          await page.close();
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error('Failed to load invoice page:', errorMsg);
          throw new Error(`Failed to load invoice page: ${errorMsg}. URL: ${baseUrl}/invoice-render`);
        }
        
        // Wait a bit more to ensure all content is rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Inject CSS to prevent blank pages
        await page.addStyleTag({
          content: `
            @media print {
              html, body {
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .invoice-template ~ * {
                display: none !important;
              }
              body > div:empty {
                display: none !important;
                height: 0 !important;
              }
            }
          `
        });
        
        // Remove any empty elements that might cause blank pages
        await page.evaluate(() => {
          const emptyElements = document.querySelectorAll('body > div:empty, body > div:not(:has(*))');
          emptyElements.forEach(el => el.remove());
        });
        
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
          preferCSSPageSize: true,
          displayHeaderFooter: false,
        });
        await page.close();

        // Sanitize filename to remove invalid characters
        const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');
        const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
        const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');

        return new NextResponse(pdf as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Invoice_${invoiceNo}_${orderNo}.pdf"`,
          },
        });
      } else {
        // Generate multiple PDFs and zip them
        const zip = new JSZip();
        
        // Sanitize filename to remove invalid characters
        const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

        for (const invoice of invoices as InvoiceData[]) {
          const page = await browser.newPage();
          await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels at 96 DPI
          const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
          
          const invoiceUrl = `${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`;
          console.log(`Navigating to invoice URL (length: ${invoiceUrl.length})`);
          
          try {
            await page.goto(invoiceUrl, {
              waitUntil: 'networkidle0',
              timeout: 30000,
            });
            console.log('Successfully loaded invoice page');
          } catch (error) {
            await page.close();
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to load invoice page:', errorMsg);
            throw new Error(`Failed to load invoice page: ${errorMsg}. URL: ${baseUrl}/invoice-render`);
          }
          
          // Wait a bit more to ensure all content is rendered
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Inject CSS to prevent blank pages
          await page.addStyleTag({
            content: `
              @media print {
                html, body {
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .invoice-template ~ * {
                  display: none !important;
                }
                body > div:empty {
                  display: none !important;
                  height: 0 !important;
                }
              }
            `
          });
          
          // Remove any empty elements that might cause blank pages
          await page.evaluate(() => {
            const body = document.body;
            if (body) {
              // Remove empty divs
              const allDivs = body.querySelectorAll('div');
              allDivs.forEach(div => {
                if (div.children.length === 0 && div.textContent?.trim() === '') {
                  div.remove();
                }
              });
              // Remove any elements after invoice template
              const invoiceTemplate = body.querySelector('.invoice-template');
              if (invoiceTemplate) {
                let nextSibling = invoiceTemplate.nextElementSibling;
                while (nextSibling) {
                  const toRemove = nextSibling;
                  nextSibling = nextSibling.nextElementSibling;
                  toRemove.remove();
                }
              }
            }
          });
          
          const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
            preferCSSPageSize: true,
            displayHeaderFooter: false,
          });
          
          const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
          const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
          const filename = `Invoice_${invoiceNo}_${orderNo}.pdf`;
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
