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
    // Page might already be closed or connection lost, ignore the error
    if (error?.message && !error.message.includes('Target closed') && !error.message.includes('Connection closed')) {
      console.warn('Error closing page:', error);
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

    // Launch browser with timeout protection
    // Configure for Vercel serverless environment
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    // Use puppeteer (with bundled Chromium) for local dev, puppeteer-core for Vercel
    const puppeteer = (isVercel ? puppeteerCore : puppeteerLocal) as any;
    
    let browser;
    try {
      let launchOptions: any;

      if (isVercel) {
        // Use @sparticuz/chromium configuration for Vercel
        // This includes all necessary system libraries bundled
        const executablePath = await chromium.executablePath();
        
        // Verify executable path is available
        if (!executablePath) {
          throw new Error('Chromium executable path not found. Make sure @sparticuz/chromium is properly installed.');
        }

        launchOptions = {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: executablePath,
          headless: chromium.headless,
          timeout: 30000,
        };
      } else {
        // Local development configuration - use regular puppeteer which includes Chromium
        launchOptions = {
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
        };
      }

      browser = await puppeteer.launch(launchOptions);
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
      // For local dev, try to detect the actual port from environment or use default
      const protocol = request.headers.get('x-forwarded-proto') || 
                       (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      const host = request.headers.get('host') || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'localhost:3000');
      const baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;

      if (batch && invoices.length > 1) {
        // Generate single PDF with multiple invoices (batch mode)
        const pdfDoc = await PDFDocument.create();
        const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

        for (const invoice of invoices as InvoiceData[]) {
          const page = await browser.newPage();
          try {
            // Set viewport FIRST, then emulate print (order matters)
            await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
            
            // Emulate print media AFTER viewport to ensure @page rules work
            await page.emulateMediaType('print');
            const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
            
            try {
              await page.goto(`${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
              });
              // Wait for invoice to be fully rendered
              await page.waitForSelector('.invoice-template', { timeout: 10000 });
              // Additional wait for any async content
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to load invoice page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            // Inject CSS - ensure print properties match master styles
            try {
              await page.addStyleTag({
                content: `
                  @page {
                    size: A4 portrait;
                    margin: 0;
                  }
                  
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  
                  .invoice-page {
                    width: 210mm !important;
                    height: 297mm !important;
                    padding: 8mm !important;
                    border: 2.5px solid #000 !important;
                    box-sizing: border-box !important;
                  }
                `
              });
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to inject styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            // Remove any empty elements that might cause blank pages
            try {
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
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to clean up page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            let pdfBytes;
            try {
              pdfBytes = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
              });
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            await safeClosePage(page);

            // Merge this invoice PDF into the main document
            const invoicePdf = await PDFDocument.load(pdfBytes);
            const pages = await pdfDoc.copyPages(invoicePdf, invoicePdf.getPageIndices());
            pages.forEach((page) => pdfDoc.addPage(page));
          } catch (error) {
            await safeClosePage(page);
            throw error;
          }
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
        try {
          // Set viewport FIRST, then emulate print (order matters)
          await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
          
          // Emulate print media AFTER viewport to ensure @page rules work
          // But our CSS won't override inline styles
          await page.emulateMediaType('print');
          
          // Encode invoice data and navigate to invoice render page (uses InvoiceTemplate component)
          const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
          try {
            await page.goto(`${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });
            // Wait for invoice to be fully rendered
            await page.waitForSelector('.invoice-template', { timeout: 10000 });
            // Additional wait for any async content
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error: unknown) {
            await safeClosePage(page);
            throw new Error(`Failed to load invoice page: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // CRITICAL: Force inline styles to match master print styles
          try {
            await page.evaluate(() => {
              const invoicePage = document.querySelector('.invoice-page') as HTMLElement;
              if (invoicePage) {
                // Force the exact styles from master print styles
                invoicePage.style.setProperty('width', '210mm', 'important');
                invoicePage.style.setProperty('min-width', '210mm', 'important');
                invoicePage.style.setProperty('max-width', '210mm', 'important');
                invoicePage.style.setProperty('height', '297mm', 'important');
                invoicePage.style.setProperty('min-height', '297mm', 'important');
                invoicePage.style.setProperty('max-height', '297mm', 'important');
                invoicePage.style.setProperty('padding', '8mm', 'important');
                invoicePage.style.setProperty('border', '2.5px solid #000', 'important');
                invoicePage.style.setProperty('position', 'relative', 'important');
                invoicePage.style.setProperty('box-sizing', 'border-box', 'important');
                invoicePage.style.setProperty('margin', '0', 'important');
                invoicePage.style.setProperty('background-color', 'white', 'important');
                invoicePage.style.setProperty('overflow', 'hidden', 'important');
              }
            });
          } catch (error) {
            await safeClosePage(page);
            throw new Error(`Failed to force inline styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // Inject CSS for print-specific properties
          try {
            await page.addStyleTag({
              content: `
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
                
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                .invoice-page {
                  width: 210mm !important;
                  height: 297mm !important;
                  padding: 8mm !important;
                  border: 2.5px solid #000 !important;
                  box-sizing: border-box !important;
                }
              `
            });
          } catch (error) {
            await safeClosePage(page);
            throw new Error(`Failed to inject styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // Remove any empty elements that might cause blank pages
          try {
            await page.evaluate(() => {
              const emptyElements = document.querySelectorAll('body > div:empty, body > div:not(:has(*))');
              emptyElements.forEach(el => el.remove());
            });
          } catch (error) {
            await safeClosePage(page);
            throw new Error(`Failed to clean up page: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          let pdf;
          try {
            // Generate PDF with small margin to prevent border clipping
            // 2mm margin ensures the 2.5px border is fully visible on all sides
            pdf = await page.pdf({
              format: 'A4',
              printBackground: true,
              preferCSSPageSize: true,
              margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
            });
          } catch (error) {
            await safeClosePage(page);
            throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          await safeClosePage(page);

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
        } catch (error) {
          await safeClosePage(page);
          throw error;
        }
      } else {
        // Generate multiple PDFs and zip them
        const zip = new JSZip();
        
        // Sanitize filename to remove invalid characters
        const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

        for (const invoice of invoices as InvoiceData[]) {
          const page = await browser.newPage();
          try {
            // Set viewport FIRST, then emulate print (order matters)
            await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
            
            // Emulate print media AFTER viewport to ensure @page rules work
            await page.emulateMediaType('print');
            
            const invoiceDataBase64 = Buffer.from(JSON.stringify(invoice)).toString('base64');
            
            try {
              await page.goto(`${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`, {
                waitUntil: 'domcontentloaded', // Changed from 'networkidle0' - more reliable
                timeout: 30000,
              });
              // Wait for invoice to be fully rendered
              await page.waitForSelector('.invoice-template', { timeout: 10000 });
              // Additional wait for any async content
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to load invoice page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            // Additional wait already done in goto catch block
            
            // CRITICAL: Force inline styles to match master print styles
            try {
              await page.evaluate(() => {
                const invoicePage = document.querySelector('.invoice-page') as HTMLElement;
                if (invoicePage) {
                  // Force the exact styles from master print styles
                  invoicePage.style.setProperty('width', '210mm', 'important');
                  invoicePage.style.setProperty('min-width', '210mm', 'important');
                  invoicePage.style.setProperty('max-width', '210mm', 'important');
                  invoicePage.style.setProperty('height', '297mm', 'important');
                  invoicePage.style.setProperty('min-height', '297mm', 'important');
                  invoicePage.style.setProperty('max-height', '297mm', 'important');
                  invoicePage.style.setProperty('padding', '8mm', 'important');
                  invoicePage.style.setProperty('border', '2.5px solid #000', 'important');
                  invoicePage.style.setProperty('position', 'relative', 'important');
                  invoicePage.style.setProperty('box-sizing', 'border-box', 'important');
                  invoicePage.style.setProperty('margin', '0', 'important');
                  invoicePage.style.setProperty('background-color', 'white', 'important');
                  invoicePage.style.setProperty('overflow', 'hidden', 'important');
                }
              });
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to force inline styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            // Inject CSS for print-specific properties
            try {
              await page.addStyleTag({
                content: `
                  @page {
                    size: A4 portrait;
                    margin: 0;
                  }
                  
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  
                  .invoice-page {
                    width: 210mm !important;
                    height: 297mm !important;
                    padding: 8mm !important;
                    border: 2.5px solid #000 !important;
                    box-sizing: border-box !important;
                  }
                `
              });
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to inject styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            // Remove any empty elements that might cause blank pages
            try {
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
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to clean up page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            let pdf;
            try {
              pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
              });
            } catch (error: unknown) {
              await safeClosePage(page);
              throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            
            const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
            const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
            const filename = `Invoice_${invoiceNo}_${orderNo}.pdf`;
            zip.file(filename, pdf);
            await safeClosePage(page);
          } catch (error: unknown) {
            await safeClosePage(page);
            throw error;
          }
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
