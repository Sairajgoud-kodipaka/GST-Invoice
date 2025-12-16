'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInvoiceRender = pathname?.startsWith('/invoice-render');

  if (isInvoiceRender) {
    // For invoice render, don't show sidebar - just render children
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  // For all other pages, show sidebar
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}








