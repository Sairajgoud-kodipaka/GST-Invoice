'use client';

import { useEffect, useState, useRef } from 'react';
import { Check, Search } from 'lucide-react';
import { MappingProgress } from '@/app/types/invoice';
import { cn } from '@/lib/utils';

interface InvoiceFieldMapperProps {
  headers: string[];
  onMappingComplete?: () => void;
}

const STANDARD_FIELDS = [
  { name: 'Order Number', patterns: ['order number', 'order no', 'order id'] },
  { name: 'Order Date', patterns: ['order date', 'created at'] },
  { name: 'Customer Name', patterns: ['billing name', 'name', 'customer name'] },
  { name: 'Billing Address', patterns: ['billing street', 'billing address'] },
  { name: 'Shipping Address', patterns: ['shipping street', 'shipping address'] },
  { name: 'Line Items', patterns: ['lineitem name', 'product name'] },
  { name: 'Quantity', patterns: ['lineitem quantity', 'quantity'] },
  { name: 'Price', patterns: ['lineitem price', 'price'] },
  { name: 'Payment Method', patterns: ['payment method'] },
];

export function InvoiceFieldMapper({
  headers,
  onMappingComplete,
}: InvoiceFieldMapperProps) {
  const [mappingProgress, setMappingProgress] = useState<MappingProgress[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [currentMappingField, setCurrentMappingField] = useState<string | null>(null);
  
  // Use refs to track progress and index to avoid closure issues
  const currentIndexRef = useRef(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;
    
    // Reset state when headers change
    setMappingProgress([]);
    setIsScanning(true);
    currentIndexRef.current = 0;
    
    // Clear any existing timeouts
    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current = [];

    // Initial scanning phase
    const scanningTimeout = setTimeout(() => {
      try {
        if (isMountedRef.current) {
          setIsScanning(false);
        }
      } catch (error) {
        console.error('[InvoiceFieldMapper] Error in scanning timeout:', error);
      }
    }, 800);
    timeoutRefs.current.push(scanningTimeout);

    const mapNextField = () => {
      // Check if component is still mounted before proceeding
      if (!isMountedRef.current) {
        return;
      }
      
      const currentIndex = currentIndexRef.current;
      
      if (currentIndex < STANDARD_FIELDS.length) {
        const field = STANDARD_FIELDS[currentIndex];
        const fieldName = field.name; // Capture field name to avoid closure issues
        
        // Show which field is being mapped
        try {
          if (isMountedRef.current) {
            setCurrentMappingField(fieldName);
          }
        } catch (error) {
          console.error('[InvoiceFieldMapper] Error setting currentMappingField:', error);
        }

        // Simulate searching for the column
        const timeout1 = setTimeout(() => {
          if (!isMountedRef.current) {
            return;
          }
          
          try {
            const foundColumn = headers.find((h) =>
              field.patterns.some((pattern) =>
                h.toLowerCase().includes(pattern.toLowerCase())
              )
            );

            // Add field with 'mapping' status using functional update
            if (isMountedRef.current) {
              setMappingProgress((prevProgress) => {
                const newProgress: MappingProgress[] = [
                  ...prevProgress,
                  {
                    field: fieldName,
                    status: 'mapping' as const,
                    csvColumn: foundColumn,
                  },
                ];
                return newProgress;
              });
            }
          } catch (error) {
            console.error('[InvoiceFieldMapper] Error in timeout1:', error);
          }

          // Mark as mapped after showing the column name
          const timeout2 = setTimeout(() => {
            if (!isMountedRef.current) {
              return;
            }
            
            try {
              setMappingProgress((prevProgress) => {
                const updated = prevProgress.map((item) =>
                  item.field === fieldName
                    ? { ...item, status: 'mapped' as const }
                    : item
                );
                return updated;
              });
              
              setCurrentMappingField(null);
              currentIndexRef.current++;
              
              if (currentIndexRef.current < STANDARD_FIELDS.length) {
                const timeout3 = setTimeout(mapNextField, 400);
                timeoutRefs.current.push(timeout3);
              } else {
                // All fields mapped - show completion
                const timeout4 = setTimeout(() => {
                  if (isMountedRef.current) {
                    try {
                      onMappingComplete?.();
                    } catch (error) {
                      console.error('[InvoiceFieldMapper] Error calling onMappingComplete:', error);
                    }
                  }
                }, 600);
                timeoutRefs.current.push(timeout4);
              }
            } catch (error) {
              console.error('[InvoiceFieldMapper] Error in timeout2:', error);
            }
          }, 600);
          timeoutRefs.current.push(timeout2);
        }, 300);
        timeoutRefs.current.push(timeout1);
      }
    };

    // Start mapping after scanning
    const initialTimeout = setTimeout(() => {
      mapNextField();
    }, 1000);
    timeoutRefs.current.push(initialTimeout);

    return () => {
      // Mark as unmounted
      isMountedRef.current = false;
      
      // Clear all timeouts
      clearTimeout(scanningTimeout);
      timeoutRefs.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      timeoutRefs.current = [];
    };
  }, [headers, onMappingComplete]);

  const progressPercentage = (mappingProgress.length / STANDARD_FIELDS.length) * 100;

  const metafields = headers.filter(
    (header) =>
      !STANDARD_FIELDS.some((field) =>
        field.patterns.some((pattern) =>
          header.toLowerCase().includes(pattern.toLowerCase())
        )
      )
  );

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Mapping CSV Fields</h3>
          <span className="text-sm text-muted-foreground">
            {mappingProgress.filter(p => p.status === 'mapped').length} / {STANDARD_FIELDS.length}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Scanning State */}
      {isScanning && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Search className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Scanning CSV columns...</p>
          </div>
        </div>
      )}

      {/* Mapping Fields */}
      <div className="space-y-2">
        {mappingProgress.map((item, index) => (
          <div
            key={`${item.field}-${index}`}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg',
              item.status === 'mapping'
                ? 'bg-primary/10 border-2 border-primary/30 shadow-sm'
                : item.status === 'mapped'
                ? 'bg-green-50 dark:bg-green-950/20 border-2 border-green-300 dark:border-green-700 shadow-sm'
                : 'bg-muted border border-transparent'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">{item.field}</p>
              </div>
              {item.csvColumn && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">→</span>
                  <p className={cn(
                    'text-sm',
                    item.status === 'mapping'
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground'
                  )}>
                    {item.csvColumn}
                  </p>
                </div>
              )}
              {!item.csvColumn && item.status === 'mapping' && (
                <p className="text-xs text-muted-foreground">
                  Searching for matching column...
                </p>
              )}
            </div>
            
            {/* Status Icons */}
            <div className="flex-shrink-0">
              {item.status === 'mapped' && (
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
              {item.status === 'mapping' && (
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              )}
            </div>
          </div>
        ))}

        {/* Current Mapping Indicator */}
        {currentMappingField && !mappingProgress.some(p => p.field === currentMappingField) && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <div className="flex-1">
              <p className="font-medium text-sm">Mapping {currentMappingField}...</p>
              <p className="text-xs text-muted-foreground mt-1">Finding matching CSV column</p>
            </div>
          </div>
        )}
      </div>

      {/* Metafields Section */}
      {metafields.length > 0 && mappingProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Additional Fields (Metafields)
            </h4>
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              {metafields.length} found
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {metafields.map((field) => (
              <span
                key={field}
                className="text-xs px-2.5 py-1.5 bg-muted rounded-md cursor-default"
              >
                {field}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            These fields will be included in your invoice as metafields
          </p>
        </div>
      )}
    </div>
  );
}

