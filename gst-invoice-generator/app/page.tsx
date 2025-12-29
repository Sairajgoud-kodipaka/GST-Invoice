'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, FileText, Plus, Settings, Calendar } from 'lucide-react';
import { Order, Invoice } from '@/app/lib/storage';
import { formatCurrency } from '@/app/lib/invoice-formatter';
import { SupabaseService } from '@/app/lib/supabase-service';

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allOrders, allInvoices] = await Promise.all([
          SupabaseService.getOrders(),
          SupabaseService.getInvoices(),
        ]);
        setOrders(allOrders);
        setInvoices(allInvoices);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };

    loadData();
    // Refresh data every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to parse DD-MM-YYYY date to Date object
  const parseOrderDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  // Helper function to parse invoice date (DD-MM-YYYY)
  const parseInvoiceDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  const totalOrders = orders.length;
  const totalInvoices = invoices.length;

  // Filter orders and invoices by date range
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((o) => {
        const orderDate = parseOrderDate(o.orderDate);
        if (!orderDate) return false;
        orderDate.setHours(0, 0, 0, 0);
        return orderDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => {
        const orderDate = parseOrderDate(o.orderDate);
        if (!orderDate) return false;
        orderDate.setHours(23, 59, 59, 999);
        return orderDate <= toDate;
      });
    }

    return filtered;
  }, [orders, dateFrom, dateTo]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((inv) => {
        const invoiceDate = parseInvoiceDate(inv.invoiceDate);
        if (!invoiceDate) return false;
        invoiceDate.setHours(0, 0, 0, 0);
        return invoiceDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((inv) => {
        const invoiceDate = parseInvoiceDate(inv.invoiceDate);
        if (!invoiceDate) return false;
        invoiceDate.setHours(23, 59, 59, 999);
        return invoiceDate <= toDate;
      });
    }

    return filtered;
  }, [invoices, dateFrom, dateTo]);

  const recentOrders = [...filteredOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentInvoices = [...filteredInvoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const hasData = totalOrders > 0 || totalInvoices > 0;

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Quick overview and fast access to common tasks
          </p>
        </div>

        {!hasData ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to GST Invoice Generator</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Get started by configuring your business settings and importing your first orders
            </p>
            <div className="flex gap-4">
              <Link href="/settings">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Get Started
                </Button>
              </Link>
              <Link href="/invoices">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Import Orders
                </Button>
              </Link>
              </div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/invoices">
                <div className="border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                      <p className="text-2xl font-bold mt-1">{totalInvoices}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              </Link>

              <Link href="/invoices">
                <div className="border rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold mt-1">{totalOrders}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Date Range:</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  placeholder="From Date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[160px]"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  placeholder="To Date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[160px]"
                />
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="h-8"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4">
              <Link href="/invoices">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Import Orders
                </Button>
              </Link>
              <Link href="/invoices">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Invoices
                </Button>
              </Link>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/invoices?orderNumber=${order.orderNumber}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName} • {order.orderDate}
                          </p>
                </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                          {!order.hasInvoice && (
                            <span className="text-xs text-orange-600">Pending</span>
                  )}
                </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Invoices */}
              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
                {recentInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices?invoiceId=${invoice.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.customerName} • {invoice.invoiceDate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        </div>
                      </Link>
                    ))}
              </div>
            )}
          </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
