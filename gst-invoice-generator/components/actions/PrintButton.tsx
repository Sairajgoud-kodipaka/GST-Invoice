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
    // Validate invoice data
    if (!invoice || !invoice.metadata || !invoice.metadata.invoiceNo) {
      alert('Invoice data is incomplete. Cannot print invoice.');
      return;
    }

    if (!printContentRef.current) {
      alert('Invoice content not available. Please refresh the page and try again.');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        // Popup blocked - try fallback
        alert('Popup blocked. Please allow popups for this site and try again, or use the browser print function (Ctrl+P / Cmd+P).');
        // Fallback: use browser print on current page
        window.print();
        return;
      }

      // Get the invoice HTML content
      const invoiceHTML = printContentRef.current.innerHTML;
      
      if (!invoiceHTML || invoiceHTML.trim().length === 0) {
        printWindow.close();
        alert('Invoice content is empty. Please refresh the page and try again.');
        return;
      }

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
      
      // Wait for content to load before printing
      printWindow.onload = () => {
        try {
          printWindow.print();
        } catch (printError) {
          console.error('Print error:', printError);
          alert('Failed to open print dialog. Please try using the browser print function (Ctrl+P / Cmd+P).');
        }
      };
      
      // Fallback timeout in case onload doesn't fire
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.print();
          }
        } catch (printError) {
          console.error('Print error (timeout):', printError);
        }
      }, 1000);
    } catch (error) {
      console.error('Print setup error:', error);
      alert('Failed to prepare invoice for printing. Please try again or use the browser print function (Ctrl+P / Cmd+P).');
    }
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



