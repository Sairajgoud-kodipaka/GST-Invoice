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
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #000;
      background: white;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
      @media print {
      @page {
        size: A4;
        margin: 2mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100%;
        height: auto !important;
        overflow: hidden !important;
      }
      body {
        display: block;
        background: white;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .invoice-template {
        margin: 0 !important;
        padding: 0 !important;
        background: white;
        page-break-after: avoid !important;
        height: auto !important;
      }
      /* Each invoice page gets a border */
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
      /* Keep line items table on one page */
      .line-items-table {
        page-break-inside: avoid !important;
      }
      .line-items-table thead {
        display: table-header-group;
      }
      .line-items-table tbody {
        display: table-row-group;
      }
      .line-items-table tr {
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
      }
      /* Keep all tables together */
      table {
        page-break-inside: avoid !important;
      }
      /* Ensure borders print */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      table, td, th {
        border: 1px solid #000 !important;
      }
      /* Prevent blank pages - hide empty elements */
      .invoice-template > div:empty,
      body > div:empty {
        display: none !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Prevent any element after invoice from creating pages */
      .invoice-template ~ * {
        display: none !important;
      }
      /* Ensure no orphaned content creates pages */
      .invoice-page,
      .invoice-template {
        page-break-after: avoid !important;
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



