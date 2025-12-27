'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  businessSettingsStorage,
  invoiceSettingsStorage,
  BusinessSettings,
  InvoiceSettings,
  ordersStorage,
  invoicesStorage,
} from '@/app/lib/storage';
import { Download, Trash2, FileText, HelpCircle, Upload } from 'lucide-react';
import JSZip from 'jszip';

export default function SettingsPage() {
  const { toast } = useToast();
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    name: '',
    legalName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    email: '',
    phone: '',
    gstin: '',
    cin: '',
    pan: '',
    logoUrl: '',
  });
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    prefix: 'INV-',
    startingNumber: 1,
    autoIncrement: true,
    defaultPaymentTerms: 30,
    defaultPaymentMethod: 'Bank Transfer',
  });
  const [latestInvoiceNumber, setLatestInvoiceNumber] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    // Load saved settings
    const savedBusiness = businessSettingsStorage.get();
    const savedInvoice = invoiceSettingsStorage.get();

    if (savedBusiness) {
      // Ensure all fields are properly set, handling undefined/null values
      setBusinessSettings({
        name: savedBusiness.name || '',
        legalName: savedBusiness.legalName || '',
        address: savedBusiness.address || '',
        city: savedBusiness.city || '',
        state: savedBusiness.state || '',
        pincode: savedBusiness.pincode || '',
        email: savedBusiness.email || '',
        phone: savedBusiness.phone || '',
        gstin: savedBusiness.gstin || '',
        cin: savedBusiness.cin || '',
        pan: savedBusiness.pan || '',
        logoUrl: savedBusiness.logoUrl || '',
      });
      if (savedBusiness.logoUrl) {
        setLogoPreview(savedBusiness.logoUrl);
      }
    }

    if (savedInvoice) {
      // Ensure all invoice settings are properly set
      setInvoiceSettings({
        prefix: savedInvoice.prefix || 'O-/',
        startingNumber: savedInvoice.startingNumber || 1,
        autoIncrement: savedInvoice.autoIncrement !== undefined ? savedInvoice.autoIncrement : true,
        defaultPaymentTerms: savedInvoice.defaultPaymentTerms || 30,
        defaultPaymentMethod: savedInvoice.defaultPaymentMethod || 'Bank Transfer',
      });
      // Initialize latest invoice number field with current format
      const prefix = savedInvoice.prefix || 'O-/';
      const startingNumber = savedInvoice.startingNumber || 1;
      setLatestInvoiceNumber(`${prefix}${startingNumber}`);
    } else {
      // If no saved invoice settings, initialize with defaults
      const defaultPrefix = 'O-/';
      const defaultStartingNumber = 1;
      setLatestInvoiceNumber(`${defaultPrefix}${defaultStartingNumber}`);
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Logo must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateGSTIN = (gstin: string): boolean => {
    // GSTIN format: 15 characters, alphanumeric
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstin.length === 15 && gstinRegex.test(gstin);
  };

  const validatePAN = (pan: string): boolean => {
    // PAN format: 10 characters, AAAAA9999A
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return pan.length === 10 && panRegex.test(pan);
  };

  const handleSaveBusiness = () => {
    // Validation
    if (!businessSettings.name || !businessSettings.legalName || !businessSettings.address ||
        !businessSettings.city || !businessSettings.state || !businessSettings.pincode ||
        !businessSettings.email || !businessSettings.phone || !businessSettings.gstin) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!validateGSTIN(businessSettings.gstin)) {
      toast({
        title: 'Invalid GSTIN',
        description: 'GSTIN must be 15 characters in correct format',
        variant: 'destructive',
      });
      return;
    }

    if (businessSettings.pan && !validatePAN(businessSettings.pan)) {
      toast({
        title: 'Invalid PAN',
        description: 'PAN must be 10 characters in correct format',
        variant: 'destructive',
      });
      return;
    }

    const settingsToSave: BusinessSettings = {
      ...businessSettings,
      logoUrl: logoPreview || businessSettings.logoUrl,
    };

    businessSettingsStorage.save(settingsToSave);
    toast({
      title: 'Success',
      description: 'Business settings saved successfully',
    });
  };

  const handleLatestInvoiceNumberChange = (value: string) => {
    setLatestInvoiceNumber(value);
    
    // Parse the invoice number to extract prefix and number
    if (value.trim()) {
      // Match pattern: prefix followed by number at the end
      const match = value.match(/^(.+?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const number = parseInt(match[2], 10);
        
        if (!isNaN(number) && number > 0) {
          // Update prefix and set starting number to the same number
          setInvoiceSettings({
            ...invoiceSettings,
            prefix: prefix,
            startingNumber: number, // Set to the same number from latest invoice
          });
        }
      } else {
        // If no number found, try to extract just the prefix
        setInvoiceSettings({
          ...invoiceSettings,
          prefix: value,
        });
      }
    }
  };

  const handleSaveInvoice = () => {
    if (invoiceSettings.prefix.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Invoice prefix cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (invoiceSettings.startingNumber < 1) {
      toast({
        title: 'Validation Error',
        description: 'Starting number must be at least 1',
        variant: 'destructive',
      });
      return;
    }

    invoiceSettingsStorage.save(invoiceSettings);
    toast({
      title: 'Success',
      description: 'Invoice settings saved successfully',
    });
  };

  const handleExportOrders = () => {
    const orders = ordersStorage.getAll();
    if (orders.length === 0) {
      toast({
        title: 'No orders',
        description: 'There are no orders to export',
        variant: 'destructive',
      });
      return;
    }

    // Convert orders to CSV
    const headers = ['Order Number', 'Order Date', 'Customer Name', 'Total Amount', 'Status', 'Invoice Number'];
    const rows = orders.map(order => [
      order.orderNumber,
      order.orderDate,
      order.customerName,
      order.totalAmount.toString(),
      order.hasInvoice ? 'Has Invoice' : 'Pending',
      order.invoiceId || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Clean up after a short delay to ensure download starts
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (a.parentNode) {
        document.body.removeChild(a);
      }
    }, 100);

    toast({
      title: 'Success',
      description: `${orders.length} order(s) exported successfully`,
    });
  };

  const handleExportInvoices = async () => {
    const invoices = invoicesStorage.getAll();
    if (invoices.length === 0) {
      toast({
        title: 'No invoices',
        description: 'There are no invoices to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Exporting...',
        description: 'Generating PDFs, please wait',
      });

      // Call API to generate PDFs
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: invoices.map(inv => inv.invoiceData), single: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDFs');
      }

      const zipBlob = await response.blob();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up after a short delay to ensure download starts
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast({
        title: 'Success',
        description: `${invoices.length} invoice(s) exported successfully`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export invoices',
        variant: 'destructive',
      });
    }
  };

  const handleClearData = (type: 'orders' | 'invoices' | 'all') => {
    try {
      if (type === 'orders' || type === 'all') {
        (ordersStorage as any).clearAll();
      }
      if (type === 'invoices' || type === 'all') {
        (invoicesStorage as any).clearAll();
      }

      toast({
        title: 'Success',
        description: `All ${type === 'all' ? 'data' : type} cleared successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear data',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure your business information and invoice preferences
          </p>
        </div>

        {/* Business Information */}
        <div className="border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Business Information</h2>
            <p className="text-sm text-muted-foreground">
              This information will be used on all invoices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="businessName"
                value={businessSettings.name}
                onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                placeholder="Pearls by Mangatrai"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">
                Legal Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="legalName"
                value={businessSettings.legalName}
                onChange={(e) => setBusinessSettings({ ...businessSettings, legalName: e.target.value })}
                placeholder="Mangatrai Gems & Jewels Private Limited"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={businessSettings.address}
                onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                placeholder="Opp. Liberty Petrol pump, Basheer Bagh"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={businessSettings.city}
                onChange={(e) => setBusinessSettings({ ...businessSettings, city: e.target.value })}
                placeholder="Hyderabad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">
                State <span className="text-red-500">*</span>
              </Label>
              <Input
                id="state"
                value={businessSettings.state}
                onChange={(e) => setBusinessSettings({ ...businessSettings, state: e.target.value })}
                placeholder="Telangana"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">
                Pincode <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pincode"
                value={businessSettings.pincode}
                onChange={(e) => setBusinessSettings({ ...businessSettings, pincode: e.target.value })}
                placeholder="500063"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={businessSettings.email}
                onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                placeholder="sales@pearlsbymangatrai.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={businessSettings.phone}
                onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                placeholder="+91 91000 09220"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">
                GSTIN <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gstin"
                value={businessSettings.gstin}
                onChange={(e) => setBusinessSettings({ ...businessSettings, gstin: e.target.value.toUpperCase() })}
                placeholder="36AAPCM2955G1Z4"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">15 characters, alphanumeric</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                value={businessSettings.pan ?? ''}
                onChange={(e) => setBusinessSettings({ ...businessSettings, pan: e.target.value.toUpperCase() })}
                placeholder="AAPCM2955G"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">10 characters, alphanumeric</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cin">CIN</Label>
              <Input
                id="cin"
                value={businessSettings.cin ?? ''}
                onChange={(e) => setBusinessSettings({ ...businessSettings, cin: e.target.value })}
                placeholder="U36900TG2021PTC158093"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logo">Company Logo</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="max-w-xs"
                />
                {logoPreview && (
                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 object-contain border rounded" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Max 2MB, will be displayed on invoices</p>
            </div>
          </div>

          <Button onClick={handleSaveBusiness} className="w-full md:w-auto">
            Save Business Information
          </Button>
        </div>

        {/* Invoice Settings */}
        <div className="border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Invoice Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure invoice numbering and default payment terms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="latestInvoiceNumber">Latest Invoice Number</Label>
              <Input
                id="latestInvoiceNumber"
                value={latestInvoiceNumber}
                onChange={(e) => handleLatestInvoiceNumberChange(e.target.value)}
                placeholder="O-/3579"
              />
              <p className="text-xs text-muted-foreground">
                Enter your latest invoice number (e.g., O-/3579). The system will extract the prefix and set the next number automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefix">Invoice Prefix</Label>
              <Input
                id="prefix"
                value={invoiceSettings.prefix}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, prefix: e.target.value })}
                placeholder="O-/"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startingNumber">Starting Number (Current: {invoiceSettings.startingNumber})</Label>
              <Input
                id="startingNumber"
                type="number"
                min="1"
                value={invoiceSettings.startingNumber}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, startingNumber: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                Next invoice number will be: {invoiceSettings.prefix}{invoiceSettings.startingNumber}
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoIncrement"
                  checked={invoiceSettings.autoIncrement}
                  onCheckedChange={(checked) => setInvoiceSettings({ ...invoiceSettings, autoIncrement: checked as boolean })}
                />
                <Label htmlFor="autoIncrement" className="cursor-pointer">
                  Auto-increment invoice numbers
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Default Payment Terms (days)</Label>
              <Input
                id="paymentTerms"
                type="number"
                min="0"
                value={invoiceSettings.defaultPaymentTerms}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, defaultPaymentTerms: parseInt(e.target.value) || 30 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Default Payment Method</Label>
              <Select
                value={invoiceSettings.defaultPaymentMethod || 'Bank Transfer'}
                onValueChange={(value) => setInvoiceSettings({ ...invoiceSettings, defaultPaymentMethod: value })}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Prepaid / Online">Prepaid / Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSaveInvoice} className="w-full md:w-auto">
            Save Invoice Settings
          </Button>
        </div>

        {/* Data Management */}
        <div className="border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Data Management</h2>
            <p className="text-sm text-muted-foreground">
              Export or clear your data
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Export Orders</h3>
                <p className="text-sm text-muted-foreground">Download all orders as CSV</p>
              </div>
              <Button variant="outline" onClick={handleExportOrders}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Export Invoices</h3>
                <p className="text-sm text-muted-foreground">Download all invoices as PDF (ZIP)</p>
              </div>
              <Button variant="outline" onClick={handleExportInvoices}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-destructive">
              <div>
                <h3 className="font-medium text-destructive">Clear All Orders</h3>
                <p className="text-sm text-muted-foreground">Permanently delete all orders</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear All Orders?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. All orders will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleClearData('orders')}>
                      Confirm Clear
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-destructive">
              <div>
                <h3 className="font-medium text-destructive">Clear All Invoices</h3>
                <p className="text-sm text-muted-foreground">Permanently delete all invoices</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear All Invoices?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. All invoices will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleClearData('invoices')}>
                      Confirm Clear
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-destructive">
              <div>
                <h3 className="font-medium text-destructive">Clear All Data</h3>
                <p className="text-sm text-muted-foreground">Permanently delete all orders and invoices</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear All Data?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. All orders and invoices will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleClearData('all')}>
                      Confirm Clear All
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Help & Support</h2>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              <strong>CSV Format:</strong> Your CSV should include columns for order information, customer details, and line items.
              Required columns include: Order Number, Order Date, Billing Name, Lineitem Name, Lineitem Quantity, Lineitem Price, Total.
            </p>
            <p className="text-muted-foreground">
              <strong>Multi-product Orders:</strong> Orders with the same order number will be automatically combined into a single invoice.
            </p>
            <p className="text-muted-foreground">
              For support, please contact: <strong>{businessSettings.email || 'sales@pearlsbymangatrai.com'}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

