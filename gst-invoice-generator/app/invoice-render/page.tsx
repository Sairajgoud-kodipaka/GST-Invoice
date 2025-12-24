'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { InvoiceData } from '@/app/types/invoice';
import { InvoiceTemplate } from '@/components/invoice/InvoiceTemplate';

function InvoiceContent() {
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        // Decode base64 in browser
        const decoded = atob(dataParam);
        const invoiceData: InvoiceData = JSON.parse(decoded);
        setInvoice(invoiceData);
      } catch (error) {
        console.error('Failed to parse invoice data:', error);
      }
    }
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen bg-white"
        style={{ margin: 0, padding: 0 }}
      >
        <p>Loading invoice...</p>
      </div>
    );
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
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: hidden !important;
          }
          .invoice-page {
            width: 210mm !important;
            max-width: 210mm !important;
            height: auto !important;
            min-height: auto !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            border: 2px solid #000 !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Keep all content on one page */
          .line-items-table {
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: avoid !important;
          }
          /* Prevent blank pages */
          body > div:empty {
            display: none !important;
            height: 0 !important;
          }
          .invoice-template ~ * {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <InvoiceTemplate invoice={invoice} />
    </div>
  );
}

export default function InvoiceRenderPage() {
  return (
    <Suspense fallback={
      <div 
        className="flex items-center justify-center min-h-screen bg-white"
        style={{ margin: 0, padding: 0 }}
      >
        <p>Loading invoice...</p>
      </div>
    }>
      <InvoiceContent />
    </Suspense>
  );
}

