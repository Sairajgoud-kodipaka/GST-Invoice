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
    // Validate invoice data before attempting download
    if (!invoice || !invoice.metadata || !invoice.metadata.invoiceNo) {
      toast({
        title: 'Error',
        description: 'Invoice data is incomplete. Cannot generate PDF.',
        variant: 'destructive',
      });
      return;
    }

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
            errorMessage = errorData.error || errorData.message || errorMessage;
            // Add helpful context for common errors
            if (errorMessage.includes('Vercel Deployment Protection')) {
              errorMessage = 'PDF generation is temporarily unavailable. Please contact support or try again later.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
              errorMessage = 'PDF generation timed out. The invoice may be too large. Please try again.';
            }
          } else {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText.substring(0, 200);
            }
          }
        } catch (parseError) {
          // Use default error message if parsing fails
          errorMessage = `Server error (${response.status}). Please try again.`;
        }
        throw new Error(errorMessage);
      }

      // Validate response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('Server returned invalid PDF file. Please try again.');
      }

      // Download the PDF
      const blob = await response.blob();
      
      // Validate blob size (should be > 0)
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty. Please try again.');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Sanitize filename
      const sanitizeFilename = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');
      const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
      const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
      link.download = `Invoice_${invoiceNo}_${orderNo}.pdf`;
      
      // Add link to DOM temporarily (required for some browsers)
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate PDF. Please check your connection and try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
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




