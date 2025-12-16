'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceData } from '@/app/types/invoice';
import { useRef } from 'react';
import { InvoiceTemplate } from '@/components/invoice/InvoiceTemplate';

interface PrintButtonProps {
  invoice: InvoiceData;
}

export function PrintButton({ invoice }: PrintButtonProps) {
  const printContentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printContentRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback: use browser print
      window.print();
      return;
    }

    // Get the invoice HTML content
    const invoiceHTML = printContentRef.current.innerHTML;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.metadata.invoiceNo}</title>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #000;
      background: white;
    }
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${invoiceHTML}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <>
      <Button onClick={handlePrint} variant="outline" size="lg">
        <Printer className="h-4 w-4 mr-2" />
        Print Invoice
      </Button>
      <div ref={printContentRef} className="hidden print:block">
        <InvoiceTemplate invoice={invoice} />
      </div>
    </>
  );
}



