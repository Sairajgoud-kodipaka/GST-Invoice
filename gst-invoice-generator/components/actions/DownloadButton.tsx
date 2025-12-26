'use client';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceData } from '@/app/types/invoice';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { InvoiceTemplate } from '@/components/invoice/InvoiceTemplate';

interface DownloadButtonProps {
  invoices: InvoiceData[];
  single?: boolean;
}

// Sanitize filename to remove invalid characters
function sanitizeFilename(filename: string): string {
  // Replace invalid filename characters with underscore
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}

export function DownloadButton({ invoices, single }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!invoices || invoices.length === 0) {
      toast({
        title: 'Error',
        description: 'No invoices to download',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // First, try to find existing visible invoice element
      let invoiceElement: HTMLElement | null = document.querySelector('.invoice-template')?.parentElement as HTMLElement;
      let container: HTMLDivElement | null = null;
      let shouldCleanup = false;

      // If no visible invoice, create one
      if (!invoiceElement || !invoiceElement.textContent || invoiceElement.textContent.length < 50) {
        shouldCleanup = true;
        // Create container - make it visible but small/off-screen for html2canvas
        container = document.createElement('div');
        container.id = 'pdf-generator-container';
        container.style.position = 'fixed';
        container.style.left = '0';
        container.style.top = '0';
        container.style.width = '794px'; // 210mm in pixels (96 DPI)
        container.style.minHeight = '1123px'; // 297mm in pixels
        container.style.backgroundColor = 'white';
        container.style.zIndex = '999999';
        container.style.overflow = 'visible';
        container.style.transform = 'scale(0.1)'; // Make it tiny but visible
        container.style.transformOrigin = 'top left';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);

        // Create wrapper div that matches InvoiceTemplate structure
        const wrapper = document.createElement('div');
        wrapper.className = 'invoice-template bg-white text-black';
        wrapper.style.fontFamily = 'Arial, sans-serif';
        wrapper.style.fontSize = '10px';
        wrapper.style.lineHeight = '1.3';
        wrapper.style.margin = '0';
        wrapper.style.padding = '0';
        wrapper.style.backgroundColor = 'white';
        container.appendChild(wrapper);

        // Render invoice in container
        const invoiceDiv = document.createElement('div');
        invoiceDiv.className = 'mx-auto invoice-page';
        invoiceDiv.style.width = '210mm';
        invoiceDiv.style.maxWidth = '210mm';
        invoiceDiv.style.padding = '8mm';
        invoiceDiv.style.border = '2.5px solid #000';
        invoiceDiv.style.boxSizing = 'border-box';
        invoiceDiv.style.backgroundColor = 'white';
        invoiceDiv.style.margin = '0 auto';
        invoiceDiv.style.position = 'relative';
        invoiceDiv.style.overflow = 'visible';
        wrapper.appendChild(invoiceDiv);

        // Render React component
        const root = createRoot(invoiceDiv);
        root.render(<InvoiceTemplate invoice={invoices[0]} />);
        
        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Wait for all images to load
        const images = invoiceDiv.querySelectorAll('img');
        if (images.length > 0) {
          await Promise.all(
            Array.from(images).map(
              (img) =>
                new Promise((resolve) => {
                  if (img.complete && img.naturalHeight !== 0) {
                    resolve(null);
                  } else {
                    img.onload = () => resolve(null);
                    img.onerror = () => resolve(null);
                    setTimeout(() => resolve(null), 3000);
                  }
                })
            )
          );
        }

        // Additional wait to ensure everything is rendered
        await new Promise(resolve => setTimeout(resolve, 500));

        // Make container normal size for capture
        container.style.transform = 'scale(1)';
        // Force a reflow
        void container.offsetHeight;
        await new Promise(resolve => setTimeout(resolve, 500));

        invoiceElement = invoiceDiv;
      }

      // Verify content is actually rendered
      if (!invoiceElement || !invoiceElement.textContent || invoiceElement.textContent.length < 50) {
        throw new Error('Invoice content not rendered. Please try again.');
      }

      // Capture invoice as image
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        allowTaint: false,
      });

      // Check if canvas has content
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture invoice - canvas is empty');
      }
      
      // Check if canvas actually has non-white pixels
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
        const hasNonWhitePixels = imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 255);
        if (!hasNonWhitePixels) {
          throw new Error('Canvas appears to be blank (all white). Content may not have rendered.');
        }
      }
      
      // Hide container after capture if we created it
      if (container) {
        container.style.display = 'none';
      }

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Check if image data is valid
      if (!imgData || imgData === 'data:,') {
        throw new Error('Failed to generate image data');
      }

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add pages if content is taller than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      const invoice = invoices[0];
      const invoiceNo = sanitizeFilename(invoice.metadata.invoiceNo || 'invoice');
      const orderNo = sanitizeFilename(invoice.metadata.orderNo || 'order');
      pdf.save(`Invoice_${invoiceNo}_${orderNo}.pdf`);

      toast({
        title: 'Success',
        description: `Invoice downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download invoice',
        variant: 'destructive',
      });
    } finally {
      // Clean up container if we created it
      const cleanupContainer = document.getElementById('pdf-generator-container');
      if (cleanupContainer && cleanupContainer.parentNode) {
        document.body.removeChild(cleanupContainer);
      }
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      variant="default"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download {invoices.length > 1 ? 'All' : 'Invoice'}
        </>
      )}
    </Button>
  );
}










