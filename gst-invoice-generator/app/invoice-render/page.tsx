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
        minHeight: '100vh',
        width: '100%'
      }}
    >
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

