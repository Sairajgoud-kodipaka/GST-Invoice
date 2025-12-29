'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceData } from '@/app/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface PDFButtonProps {
  invoice: InvoiceData;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PDFButton({ 
  invoice, 
  variant = 'default', 
  className,
  size = 'default'
}: PDFButtonProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setGenerating(true);
    
    try {
      // Call server-side PDF API (reliable Puppeteer method)
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: [invoice],
          single: true,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate PDF';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          }
        } catch {
          // Use default error message
        }
        throw new Error(errorMessage);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Sanitize filename
      const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');
      const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
      const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
      link.download = `Invoice_${invoiceNo}_${orderNo}.pdf`;
      
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={generating}
      variant={variant}
      size={size}
      className={className}
    >
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}




