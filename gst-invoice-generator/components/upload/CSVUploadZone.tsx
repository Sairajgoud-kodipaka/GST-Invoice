'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CSVUploadZoneProps {
  onFileSelect: (files: File[]) => void; 
  className?: string;
}

export function CSVUploadZone({ onFileSelect, className }: CSVUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const csvFiles = acceptedFiles.filter((file) => file.name.endsWith('.csv'));
      if (csvFiles.length > 0) {
        onFileSelect(csvFiles);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50',
        className
      )}
    >
      <input {...getInputProps({ multiple: true })} />
      <div className="flex flex-col items-center gap-4">
        {acceptedFiles.length > 0 ? (
          <>
            <FileText className="h-12 w-12 text-primary" />
            <div>
              {acceptedFiles.length === 1 ? (
                <>
                  <p className="text-lg font-medium">{acceptedFiles[0].name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click or drag to replace
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">{acceptedFiles.length} file{acceptedFiles.length > 1 ? 's' : ''} selected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click or drag to replace
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop CSV file here' : 'Drag & drop CSV file here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports Shopify export format
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}










