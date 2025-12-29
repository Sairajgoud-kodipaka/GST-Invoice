'use client';

import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { parseCSV } from '@/app/lib/csv-parser';
import { mapCSVToInvoice, mapMultipleOrders } from '@/app/lib/field-mapper';
import { numberToWords } from '@/app/lib/invoice-formatter';
import { calculateInvoiceTotals } from '@/app/lib/invoice-calculator';
import { ParsedCSVData, InvoiceData } from '@/app/types/invoice';
import { invoiceService } from '@/app/lib/invoice-service';
import { useToast } from '@/hooks/use-toast';
import { CSVUploadZone } from './CSVUploadZone';

interface CSVProcessorProps {
  onInvoicesReady: (invoices: InvoiceData[]) => void;
  onError: (error: string) => void;
}

export function CSVProcessor({ onInvoicesReady, onError }: CSVProcessorProps): ReactElement {
  const [step, setStep] = useState<'upload' | 'processing' | 'complete'>('upload');
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (files: File[]) => {
    setCsvFiles(files);
    setStep('processing');
    setProgress(0);

    const allInvoices: InvoiceData[] = [];
    const totalFiles = files.length;
    const processedFiles: { name: string; success: boolean; error?: string; invoiceCount: number }[] = [];

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const fileProgressStart = (fileIndex / totalFiles) * 100;
      const fileProgressEnd = ((fileIndex + 1) / totalFiles) * 100;
      const fileProgressRange = fileProgressEnd - fileProgressStart;

      try {
        // Parse CSV
        setProgress(fileProgressStart + fileProgressRange * 0.2);
        const data = await parseCSV(file, {
          onProgress: (p: number) => {
            setProgress(fileProgressStart + fileProgressRange * (0.2 + p * 0.3));
          },
        });

        setProgress(fileProgressStart + fileProgressRange * 0.6);

        // Validate required fields before processing
        const validationErrors: string[] = [];
        
        // Check for required columns
        const hasOrderNumber = data.headers.some(h => 
          /order\s*(number|no|id)/i.test(h)
        );
        const hasCustomerName = data.headers.some(h => 
          /(billing\s*name|customer\s*name|name)/i.test(h)
        );
        const hasLineItem = data.headers.some(h => 
          /(lineitem\s*name|product\s*name|item\s*name)/i.test(h)
        );
        const hasPrice = data.headers.some(h => 
          /(lineitem\s*price|price|unit\s*price)/i.test(h)
        );
        const hasQuantity = data.headers.some(h => 
          /(lineitem\s*quantity|quantity|qty)/i.test(h)
        );

        if (!hasOrderNumber && !hasCustomerName) {
          validationErrors.push('Missing required field: Order Number or Customer Name');
        }
        if (!hasLineItem) {
          validationErrors.push('Missing required field: Line Item Name (Product Name)');
        }
        if (!hasPrice) {
          validationErrors.push('Missing required field: Price');
        }
        if (!hasQuantity) {
          validationErrors.push('Missing required field: Quantity');
        }

        // Check if CSV has any data rows
        if (data.rows.length === 0) {
          validationErrors.push('CSV file contains no data rows');
        }

        // Check if at least one row has required data
        if (data.rows.length > 0) {
          const firstRow = data.rows[0];
          let hasValidData = false;
          
          // Check if we have at least customer name or order number
          const customerNameCol = data.headers.find(h => 
            /(billing\s*name|customer\s*name|name)/i.test(h)
          );
          const orderNumberCol = data.headers.find(h => 
            /order\s*(number|no|id)/i.test(h)
          );
          
          if (customerNameCol && firstRow[customerNameCol] && String(firstRow[customerNameCol]).trim()) {
            hasValidData = true;
          } else if (orderNumberCol && firstRow[orderNumberCol] && String(firstRow[orderNumberCol]).trim()) {
            hasValidData = true;
          }
          
          if (!hasValidData) {
            validationErrors.push('CSV file does not contain valid customer or order data');
          }
        }

        if (validationErrors.length > 0) {
          throw new Error(`Validation failed for ${file.name}: ${validationErrors.join('; ')}`);
        }

        // Map CSV to invoices (without invoice numbers first)
        let rawInvoices: InvoiceData[];
        try {
          rawInvoices = data.rows.length === 1
            ? [mapCSVToInvoice(data, 0)]
            : mapMultipleOrders(data);
        } catch (mappingError) {
          throw new Error(`Failed to map CSV data: ${mappingError instanceof Error ? mappingError.message : 'Unknown mapping error'}`);
        }

        setProgress(fileProgressStart + fileProgressRange * 0.5);

        // Use invoice numbers already set by field-mapper (which uses order-based mapping)
        // Check for duplicates and create invoices in Supabase
        const invoicesWithNumbers: InvoiceData[] = [];
        const skippedInvoices: Array<{ invoiceNo: string; reason: string; orderNo: string }> = [];
        const updatedOrders: Array<{ orderNo: string; differences: Array<{ field: string; oldValue: any; newValue: any }> }> = [];
        
        for (const invoice of rawInvoices) {
          // Use the invoice number that was already set by the field-mapper
          // This respects the order-based mapping configured in settings
          const expectedInvoiceNo = invoice.metadata.invoiceNo;
          const orderNo = invoice.metadata.orderNo;
          
          console.log(`Processing order ${orderNo} with expected invoice ${expectedInvoiceNo}`);
          
          // EDGE CASE 1: Check if order already exists
          try {
            const orderCheckResponse = await fetch('/api/orders/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderNo: orderNo,
                orderDate: invoice.metadata.orderDate,
                customerName: invoice.billToParty.name,
                totalAmount: invoice.taxSummary.totalAmountAfterTax,
                orderData: invoice,
              }),
            });
            
            if (!orderCheckResponse.ok) {
              // Network or server error - log but continue (don't block import)
              console.warn(`Order check failed for ${orderNo}, continuing with import`);
            } else {
              const orderCheck = await orderCheckResponse.json();
              
              if (orderCheck.exists) {
                if (orderCheck.isIdentical) {
                  // Order exists and is exactly the same - skip with message
                  console.log(`Order ${orderNo} already exists and is identical`);
                  skippedInvoices.push({
                    invoiceNo: expectedInvoiceNo,
                    reason: `This order already exists. Order ${orderNo} has not changed.`,
                    orderNo: orderNo,
                  });
                  continue;
                } else {
                  // Order exists but has changes - update it
                  console.log(`Order ${orderNo} exists but has changes:`, orderCheck.differences);
                  updatedOrders.push({
                    orderNo: orderNo,
                    differences: orderCheck.differences || [],
                  });
                  
                  // Update the order in database (will be handled by upsert in bulk-create)
                  // But we also need to update the invoice if it exists
                  if (orderCheck.existingOrder?.hasInvoice && orderCheck.existingOrder?.invoiceId) {
                    // Update the invoice data
                    try {
                      const updateInvoiceResponse = await fetch('/api/invoices/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: orderCheck.existingOrder.invoiceId,
                          updates: {
                            invoiceData: invoice,
                            amount: invoice.taxSummary.totalAmountAfterTax,
                            customerName: invoice.billToParty.name,
                          },
                        }),
                      });
                      
                      if (updateInvoiceResponse.ok) {
                        console.log(`Updated invoice for order ${orderNo}`);
                        // Get the existing invoice number from the invoice
                        const invoiceResponse = await updateInvoiceResponse.json();
                        const existingInvoiceNo = invoiceResponse.invoice?.invoiceNumber || 
                                                  orderCheck.existingOrder.orderData?.metadata?.invoiceNo || 
                                                  expectedInvoiceNo;
                        invoice.metadata.invoiceNo = existingInvoiceNo;
                        invoicesWithNumbers.push(invoice);
                        continue;
                      }
                    } catch (updateError) {
                      console.error(`Error updating invoice for order ${orderNo}:`, updateError);
                      // Continue with normal flow if update fails
                    }
                  }
                  
                  // If no invoice exists yet, continue with normal flow
                  // The order will be updated via upsert
                }
              }
            }
            }
          } catch (error) {
            // Network or parsing error - log but continue (don't block import)
            console.warn(`Error checking order ${orderNo}, continuing with import:`, error);
            // Continue with normal flow if check fails
          }
          
          // STRICT VALIDATION 1: Check if order already has an invoice (prevent regeneration)
          try {
            const orderCheckResponse = await fetch('/api/invoices/check-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderNo }),
            });
            
            if (!orderCheckResponse.ok) {
              // Network or server error - log but continue (don't block import)
              console.warn(`Invoice check failed for order ${orderNo}, continuing with import`);
            } else {
              const orderCheck = await orderCheckResponse.json();
              if (orderCheck.hasInvoice) {
                // Order already has an invoice - but we already handled updates above
                // Only skip if we didn't update it
                const wasUpdated = updatedOrders.some(u => u.orderNo === orderNo);
                if (!wasUpdated) {
                console.log(`Order ${orderNo} already has invoice ${orderCheck.invoice.invoiceNo}`);
                skippedInvoices.push({
                  invoiceNo: expectedInvoiceNo,
                  reason: `Order ${orderNo} already has invoice ${orderCheck.invoice.invoiceNo}. Cannot regenerate invoices.`,
                  orderNo: orderNo,
                });
                continue;
                }
              }
            }
            }
          } catch (error) {
            // Network or parsing error - log but continue (don't block import)
            console.warn(`Error checking invoice for order ${orderNo}, continuing with import:`, error);
            // Continue with normal flow
          }
          
          // STRICT VALIDATION 2: Check if invoice number already exists (prevent duplicates)
          try {
            const invoiceExistsCheck = await invoiceService.exists(expectedInvoiceNo);
            if (invoiceExistsCheck.exists) {
              // Invoice number already exists - this is a duplicate, do NOT skip numbers
              console.log(`Invoice ${expectedInvoiceNo} already exists for order ${invoiceExistsCheck.invoice?.orderNo || 'unknown'}`);
              skippedInvoices.push({
                invoiceNo: expectedInvoiceNo,
                reason: `Invoice ${expectedInvoiceNo} already exists for order ${invoiceExistsCheck.invoice?.orderNo || 'unknown'}. Cannot use duplicate invoice number.`,
                orderNo: orderNo,
              });
              continue;
            }
          } catch (error) {
            // Network or service error - log but continue (don't block import)
            // Only skip if it's a critical validation error, not a network issue
            console.warn(`Error checking invoice ${expectedInvoiceNo}, continuing with import:`, error);
            // Don't skip on network errors - let the create endpoint handle duplicate detection
          }
          
          // Validate invoice data structure before creating
          if (!invoice.metadata || !invoice.metadata.invoiceDate) {
            skippedInvoices.push({
              invoiceNo: expectedInvoiceNo,
              reason: `Invoice data is incomplete. Missing invoiceDate in metadata. Please check your CSV file.`,
              orderNo: orderNo,
            });
            continue;
          }

          if (!invoice.billToParty || !invoice.billToParty.name) {
            skippedInvoices.push({
              invoiceNo: expectedInvoiceNo,
              reason: `Invoice data is incomplete. Missing customer/billing name. Please check your CSV file.`,
              orderNo: orderNo,
            });
            continue;
          }

          if (!invoice.taxSummary || invoice.taxSummary.totalAmountAfterTax === undefined || isNaN(invoice.taxSummary.totalAmountAfterTax)) {
            skippedInvoices.push({
              invoiceNo: expectedInvoiceNo,
              reason: `Invoice data is incomplete. Missing or invalid total amount. Please check your CSV file.`,
              orderNo: orderNo,
            });
            continue;
          }

          // Validate line items
          if (!invoice.lineItems || !Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
            skippedInvoices.push({
              invoiceNo: expectedInvoiceNo,
              reason: `Invoice data is incomplete. Missing line items. Please check your CSV file.`,
              orderNo: orderNo,
            });
            continue;
          }

          // Invoice number is available and matches expected mapping - create it
          console.log(`Creating invoice ${expectedInvoiceNo} for order ${orderNo}`);
          
          try {
            const createResult = await invoiceService.create(
              expectedInvoiceNo,
              orderNo,
              invoice.metadata.invoiceDate,
              {
                orderDate: invoice.metadata.orderDate,
                customerName: invoice.billToParty.name,
                totalAmount: invoice.taxSummary.totalAmountAfterTax,
                invoiceData: invoice,
              }
            );
            
            if (createResult.success) {
              // Successfully created with the expected invoice number
              console.log(`Successfully created invoice ${expectedInvoiceNo} for order ${orderNo}`);
              invoice.metadata.invoiceNo = expectedInvoiceNo;
              invoicesWithNumbers.push(invoice);
            } else if (createResult.exists) {
              // Duplicate detected during creation (race condition)
              console.log(`Invoice creation failed - duplicate detected for order ${orderNo}`);
              if (createResult.orderExists) {
                // Order already has an invoice - prevent regeneration
                skippedInvoices.push({
                  invoiceNo: expectedInvoiceNo,
                  reason: `Order ${orderNo} already has invoice ${createResult.existingInvoice?.invoiceNo || expectedInvoiceNo}. Cannot regenerate invoices.`,
                  orderNo: orderNo,
                });
              } else {
                // Invoice number taken by different order - duplicate
                skippedInvoices.push({
                  invoiceNo: expectedInvoiceNo,
                  reason: `Invoice ${expectedInvoiceNo} already exists for order ${createResult.existingInvoice?.orderNo || 'unknown'}. Cannot use duplicate invoice number.`,
                  orderNo: orderNo,
                });
              }
            } else {
              // Other error
              console.error(`Failed to create invoice ${expectedInvoiceNo} for order ${orderNo}:`, createResult.error);
              skippedInvoices.push({
                invoiceNo: expectedInvoiceNo,
                reason: createResult.error || 'Failed to create invoice. Please try again or check your network connection.',
                orderNo: orderNo,
              });
            }
          } catch (createError) {
            // Network or unexpected error during creation
            console.error(`Unexpected error creating invoice ${expectedInvoiceNo} for order ${orderNo}:`, createError);
            skippedInvoices.push({
              invoiceNo: expectedInvoiceNo,
              reason: `Failed to create invoice: ${createError instanceof Error ? createError.message : 'Network or server error. Please try again.'}`,
              orderNo: orderNo,
            });
          }
        }
        
        console.log(`Processed ${rawInvoices.length} invoices: ${invoicesWithNumbers.length} created, ${skippedInvoices.length} skipped`);

        setProgress(fileProgressStart + fileProgressRange * 0.7);

        // Recalculate all totals using proper GST calculations
        // This ensures line items, taxes, and totals are all consistent
        const calculatedInvoices = invoicesWithNumbers.map(calculateInvoiceTotals);

        setProgress(fileProgressStart + fileProgressRange * 0.8);

        // Add amount in words (use calculated total)
        const finalInvoices = calculatedInvoices.map((invoice: InvoiceData) => {
          return {
            ...invoice,
            amountInWords: numberToWords(invoice.taxSummary.totalAmountAfterTax),
          };
        });

        // Show success message for updated orders
        if (updatedOrders.length > 0) {
          const updateDetails = updatedOrders.slice(0, 3).map(u => {
            const diffSummary = u.differences.map(d => {
              if (d.field === 'financialStatus') {
                return `Status: ${d.oldValue} → ${d.newValue}`;
              } else if (d.field === 'paymentMethod') {
                return `Payment: ${d.oldValue} → ${d.newValue}`;
              } else if (d.field === 'totalAmount' || d.field === 'orderDataTotal') {
                return `Amount: ₹${d.oldValue} → ₹${d.newValue}`;
              } else {
                return `${d.field}: ${d.oldValue} → ${d.newValue}`;
              }
            }).join(', ');
            return `Order ${u.orderNo}: ${diffSummary}`;
          }).join('\n');
          const moreCount = updatedOrders.length > 3 ? `\n... and ${updatedOrders.length - 3} more orders` : '';
          
          toast({
            title: `${updatedOrders.length} order(s) updated`,
            description: `The following orders were updated with new data:\n\n${updateDetails}${moreCount}\n\nOrders and invoices have been updated in the database.`,
            duration: 20000, // Show for 20 seconds
          });
        }

        // Show warnings for skipped invoices
        if (skippedInvoices.length > 0) {
          const allSkipped = skippedInvoices.length === rawInvoices.length;
          const alreadyExistsCount = skippedInvoices.filter(s => 
            s.reason.includes('already has invoice') || 
            s.reason.includes('already exists') ||
            s.reason.includes('This order already exists')
          ).length;
          
          let title = '';
          let description = '';
          
          if (allSkipped && alreadyExistsCount === skippedInvoices.length) {
            // All invoices already exist
            title = 'All orders already exist';
            const identicalCount = skippedInvoices.filter(s => 
              s.reason.includes('This order already exists')
            ).length;
            
            if (identicalCount === skippedInvoices.length) {
              // All are identical
              description = `All ${skippedInvoices.length} order(s) already exist and are identical. No changes detected.\n\nExamples:\n${skippedInvoices.slice(0, 3).map(s => `Order ${s.orderNo}`).join('\n')}${skippedInvoices.length > 3 ? `\n... and ${skippedInvoices.length - 3} more` : ''}`;
            } else {
              // Mix of identical and with invoices
            const skippedDetails = skippedInvoices.slice(0, 3).map(s => {
                if (s.reason.includes('This order already exists')) {
                  return `Order ${s.orderNo} (identical)`;
                } else {
              const invoiceMatch = s.reason.match(/invoice (O-\/\d+)/);
              const existingInvoice = invoiceMatch ? invoiceMatch[1] : 'existing invoice';
              return `Order ${s.orderNo} → Invoice ${existingInvoice}`;
                }
            }).join('\n');
            const moreCount = skippedInvoices.length > 3 ? `\n... and ${skippedInvoices.length - 3} more orders` : '';
              description = `All ${skippedInvoices.length} order(s) already exist.\n\nExamples:\n${skippedDetails}${moreCount}`;
            }
          } else if (allSkipped) {
            // All skipped but mixed reasons
            title = 'All invoices were skipped';
            description = `All ${skippedInvoices.length} invoice(s) could not be created. Check console for details.`;
          } else {
            // Partial skip
            title = 'Some invoices were skipped';
            const skippedDetails = skippedInvoices.slice(0, 3).map(s => 
              `Order ${s.orderNo}: ${s.reason}`
            ).join('\n');
            const moreCount = skippedInvoices.length > 3 ? `\n... and ${skippedInvoices.length - 3} more` : '';
            description = `${skippedInvoices.length} invoice(s) could not be created:\n${skippedDetails}${moreCount}`;
          }
          
          toast({
            title,
            description,
            variant: 'destructive',
            duration: 15000, // Show for 15 seconds
          });
        }

        allInvoices.push(...finalInvoices);
        
        // Determine if this file was successful
        const hasSuccessfulInvoices = finalInvoices.length > 0;
        const allWereSkipped = skippedInvoices.length === rawInvoices.length && rawInvoices.length > 0;
        
        processedFiles.push({
          name: file.name,
          success: hasSuccessfulInvoices,
          error: allWereSkipped 
            ? `All ${rawInvoices.length} invoice(s) were skipped. See details in toast notification above.`
            : undefined,
          invoiceCount: finalInvoices.length,
        });
        setProgress(fileProgressStart + fileProgressRange * 0.9);
      } catch (error) {
        // Continue processing other files even if one fails
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        processedFiles.push({
          name: file.name,
          success: false,
          error: errorMessage,
          invoiceCount: 0,
        });
        // Still update progress for failed file
        setProgress(fileProgressStart + fileProgressRange * 0.9);
      }
    }

    setProgress(100);
    setStep('complete');

    // Report results
    const successfulFiles = processedFiles.filter(f => f.success).length;
    const failedFiles = processedFiles.filter(f => !f.success);
    const totalInvoices = allInvoices.length;

    if (failedFiles.length > 0) {
      // Partial success - show warning with details
      const failedFileNames = failedFiles.map(f => f.name).join(', ');
      const errorMessage = failedFiles.length === totalFiles
        ? `All files failed to process. ${failedFiles[0]?.error || 'Unknown error'}`
        : `${failedFiles.length} file(s) failed: ${failedFileNames}. ${successfulFiles} file(s) processed successfully with ${totalInvoices} invoice(s).`;
      
      if (totalInvoices > 0) {
        // Partial success - still call onInvoicesReady but also show error
        onInvoicesReady(allInvoices);
        onError(errorMessage);
      } else {
        // Complete failure
        onError(errorMessage);
        setStep('upload');
      }
    } else {
      // Complete success
      if (totalInvoices > 0) {
        onInvoicesReady(allInvoices);
      } else {
        // Check if all invoices were skipped
        const allSkipped = processedFiles.every(f => f.error && f.error.includes('skipped'));
        if (allSkipped) {
          const totalSkipped = processedFiles.reduce((sum, f) => {
            const match = f.error?.match(/(\d+) invoice\(s\) were skipped/);
            return sum + (match ? parseInt(match[1]) : 0);
          }, 0);
          
          onError(`All ${totalSkipped || processedFiles.length} invoice(s) were skipped because the orders already have invoices.\n\nThese invoices already exist in the database and cannot be regenerated.\n\nTo import these orders again:\n1. Go to the Invoices page\n2. Delete the existing invoices for these orders\n3. Then re-import the CSV file\n\nCheck the toast notification above for specific order numbers.`);
        } else {
          onError('No invoices were generated from the uploaded files. Please check the CSV format and try again.');
        }
        setStep('upload');
      }
    }
  }, [onError, onInvoicesReady]);

  return (
    <>
      {step === 'upload' && (
        <CSVUploadZone onFileSelect={handleFileSelect} />
      )}
    </>
  );
}

