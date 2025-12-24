import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { InvoiceData } from '@/app/types/invoice';

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
    // Enhanced args for Vercel serverless environment
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Overcome limited resource problems
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // Required for Vercel
          '--disable-gpu',
        ],
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

      if (batch && invoices.length > 1) {
        // Generate single PDF with multiple invoices (batch mode)
        const pdfDoc = await PDFDocument.create();
        const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

        for (const invoice of invoices as InvoiceData[]) {
          const page = await browser.newPage();
          await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels at 96 DPI
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
          
          await page.goto(`${baseUrl}/invoice-render?data=${encodeURIComponent(invoiceDataBase64)}`, {
            waitUntil: 'networkidle0',
          });
          
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
