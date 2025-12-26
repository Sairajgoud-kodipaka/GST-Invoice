// Fully server-rendered page - no client-side hydration
import { InvoiceData } from '@/app/types/invoice';
import { InvoiceTemplate } from '@/components/invoice/InvoiceTemplate';

// Server component - no hydration needed
function InvoiceContent({ invoice }: { invoice: InvoiceData }) {
  return (
    <div 
      style={{ 
        margin: 0, 
        padding: 0, 
        background: 'white',
        height: 'auto',
        minHeight: 'auto',
        width: '100%'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 2mm;
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
            background: white !important;
          }
          
          .invoice-page {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 8mm !important;
            border: 2.5px solid #000 !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          .line-items-table {
            page-break-inside: avoid !important;
          }
        }
      ` }} />
      <InvoiceTemplate invoice={invoice} />
    </div>
  );
}

// Server component that decodes data and passes to client component
// Works in both development and Vercel production
export default async function InvoiceRenderSSRPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  // Next.js 15 requires searchParams to be a Promise
  const params = await searchParams;
  let invoice: InvoiceData | null = null;

  if (params.data) {
    try {
      // Decode base64 on server - handle URL encoding from query string
      // The data comes URL-encoded from the query parameter
      let dataToDecode = params.data;
      
      // Try URL decoding first (most common case)
      try {
        dataToDecode = decodeURIComponent(params.data);
      } catch {
        // If URL decode fails, use original (might already be decoded)
        dataToDecode = params.data;
      }
      
      // Decode base64
      const decoded = Buffer.from(dataToDecode, 'base64').toString('utf-8');
      invoice = JSON.parse(decoded) as InvoiceData;
    } catch (error) {
      console.error('Failed to parse invoice data:', error);
      // Return null - will show error message
    }
  }

  if (!invoice) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen bg-white"
        style={{ margin: 0, padding: 0 }}
      >
        <p>Invalid invoice data</p>
      </div>
    );
  }

  // Pass invoice directly as prop - no useSearchParams, no Suspense, no hydration delays
  return <InvoiceContent invoice={invoice} />;
}

