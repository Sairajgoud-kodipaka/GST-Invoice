// ✅ NO 'use client' - This is a Server Component
import { InvoiceTemplate } from '@/components/invoice/InvoiceTemplate';
import { InvoiceData } from '@/app/types/invoice';

interface PageProps {
  searchParams: Promise<{
    data?: string;
    hidePageNumbers?: string;
  }>;
}

export default async function InvoiceRenderSSRPage({ searchParams }: PageProps) {
  // Next.js 15 requires searchParams to be a Promise
  const params = await searchParams;
  
  // Decode invoice data from URL
  if (!params.data) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">No invoice data provided</h1>
      </div>
    );
  }

  let invoiceData: InvoiceData;
  
  try {
    // Next.js automatically URL-decodes query params, so params.data is already decoded
    // Just parse the JSON directly
    invoiceData = JSON.parse(params.data);
  } catch (error) {
    console.error('Failed to parse invoice data:', error);
    console.error('Data received:', params.data?.substring(0, 100));
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Invalid invoice data</h1>
        <p className="text-sm text-gray-500 mt-2">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  const hidePageNumbers = params.hidePageNumbers === 'true';

  return (
    <>
      {/* ✅ Server-rendered invoice - NO JavaScript needed */}
      <InvoiceTemplate invoice={invoiceData} hidePageNumbers={hidePageNumbers} />
      
      {/* ✅ Print styles included directly - using dangerouslySetInnerHTML for Server Component */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Base styles - always applied - ensure border is always visible */
        * {
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }
        
        body {
          background: white;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 0;
        }
        
        .invoice-template {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 0;
          margin: 0;
          background: white;
        }
        
        .invoice-page {
          /* Account for 5mm margin on sides: 210mm - 10mm = 200mm, 297mm - 13mm (5mm top + 8mm bottom) = 284mm */
          width: 200mm !important;
          min-width: 200mm !important;
          max-width: 200mm !important;
          height: auto !important;
          min-height: 284mm !important;
          max-height: none !important;
          padding: 8mm !important;
          border: 2.5px solid #000 !important;
          box-sizing: border-box !important;
          margin: 0 auto !important;
          background: white !important;
          position: relative !important;
          overflow: visible !important;
        }
        
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 5mm 8mm 5mm; /* top right bottom left - increased bottom margin */
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .invoice-template,
          .invoice-template * {
            visibility: visible;
          }
          
          .invoice-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .invoice-page {
            /* Account for 5mm margins on sides, 5mm top, 8mm bottom */
            width: 200mm !important;
            min-width: 200mm !important;
            max-width: 200mm !important;
            height: 284mm !important;
            min-height: 284mm !important;
            max-height: 284mm !important;
            padding: 8mm !important;
            border: 2.5px solid #000 !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
        }
        
        @media screen {
          body {
            background: #f5f5f5;
            padding: 20px;
          }
          
          .invoice-page {
            /* Account for 5mm margins on sides, 5mm top, 8mm bottom for PDF generation */
            width: 200mm !important;
            min-width: 200mm !important;
            max-width: 200mm !important;
            height: auto !important;
            min-height: 284mm !important;
            max-height: none !important;
            padding: 8mm !important;
            border: 2.5px solid #000 !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            overflow: visible !important;
            background: white !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
        }
      ` }} />
    </>
  );
}
