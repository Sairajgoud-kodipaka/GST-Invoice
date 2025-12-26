'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceData } from '@/app/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface BatchPDFButtonProps {
  invoices: InvoiceData[];
  variant?: 'default' | 'outline' | 'ghost';
  mode?: 'merged' | 'zip'; // merged = single PDF, zip = multiple PDFs in ZIP
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function BatchPDFButton({ 
  invoices, 
  variant = 'default',
  mode = 'merged',
  size = 'default',
  className
}: BatchPDFButtonProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (invoices.length === 0) {
      toast({
        title: 'Error',
        description: 'No invoices selected',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    
    try {
      // Call batch PDF API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices,
          batch: mode === 'merged',
          zip: mode === 'zip',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate PDFs';
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

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      
      if (mode === 'merged') {
        link.download = `Invoices-Batch-${dateStr}.pdf`;
      } else {
        link.download = `Invoices-${dateStr}.zip`;
      }
      
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: mode === 'merged' 
          ? `${invoices.length} invoice(s) merged into one PDF` 
          : `${invoices.length} invoice(s) downloaded as ZIP`,
      });

    } catch (error) {
      console.error('Batch PDF generation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate PDFs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={generating || invoices.length === 0}
      variant={variant}
      size={size}
      className={className}
    >
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating {invoices.length} PDF{invoices.length !== 1 ? 's' : ''}...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {mode === 'merged' 
            ? `Download ${invoices.length} as PDF` 
            : `Download ${invoices.length} as ZIP`}
        </>
      )}
    </Button>
  );
}

