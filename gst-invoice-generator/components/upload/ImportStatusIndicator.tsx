'use client';

import { useEffect, useState } from 'react';

interface ImportStatusIndicatorProps {
  step: 'upload' | 'processing' | 'complete';
  progress: number;
  fileName?: string;
}

export function ImportStatusIndicator({ step, progress, fileName }: ImportStatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (step !== 'upload') {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'complete') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!isVisible) return null;

  const getStatusText = () => {
    switch (step) {
      case 'processing':
        return 'Processing file...';
      case 'complete':
        return 'Import complete';
      default:
        return 'Preparing...';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Import Status</span>
            {step === 'complete' && (
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          {fileName && (
            <p className="text-xs text-gray-500 truncate">
              {fileName}
            </p>
          )}
          
          <div className="space-y-1.5">
            <p className="text-xs text-gray-600">{getStatusText()}</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gray-700 rounded-full h-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">{Math.round(progress)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

