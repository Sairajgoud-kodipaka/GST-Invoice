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
} from '@/app/lib/storage';
import { SupabaseService } from '@/app/lib/supabase-service';
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
    startingOrderNumber: undefined,
    startingInvoiceNumber: undefined,
  });
  const [latestInvoiceNumber, setLatestInvoiceNumber] = useState<string>('');
  const [orderInvoiceMapping, setOrderInvoiceMapping] = useState<{ orderNumber: string; invoiceNumber: string }>({
    orderNumber: '',
    invoiceNumber: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      // Load business settings from Supabase (with localStorage fallback)
      try {
        const savedBusiness = await businessSettingsStorage.get();
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
      } catch (error) {
        console.error('Error loading business settings:', error);
        // Fallback to localStorage sync version
        const savedBusiness = businessSettingsStorage.getSync();
        if (savedBusiness) {
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
      }

      // Load invoice settings from Supabase (with localStorage fallback)
      try {
        const savedInvoice = await invoiceSettingsStorage.get();
        if (savedInvoice) {
          // Ensure all invoice settings are properly set
          setInvoiceSettings({
            prefix: savedInvoice.prefix || 'O-/',
            startingNumber: savedInvoice.startingNumber || 1,
            autoIncrement: savedInvoice.autoIncrement !== undefined ? savedInvoice.autoIncrement : true,
            defaultPaymentTerms: savedInvoice.defaultPaymentTerms || 30,
            defaultPaymentMethod: savedInvoice.defaultPaymentMethod || 'Bank Transfer',
            startingOrderNumber: savedInvoice.startingOrderNumber,
            startingInvoiceNumber: savedInvoice.startingInvoiceNumber,
          });
          // Initialize latest invoice number field with current format
          const prefix = savedInvoice.prefix || 'O-/';
          const startingNumber = savedInvoice.startingNumber || 1;
          setLatestInvoiceNumber(`${prefix}${startingNumber}`);
          
          // Initialize order-invoice mapping fields
          if (savedInvoice.startingOrderNumber !== undefined && savedInvoice.startingInvoiceNumber !== undefined) {
            setOrderInvoiceMapping({
              orderNumber: savedInvoice.startingOrderNumber.toString(),
              invoiceNumber: `${prefix}${savedInvoice.startingInvoiceNumber}`,
            });
          }
        } else {
          // If no saved invoice settings, initialize with defaults
          const defaultPrefix = 'O-/';
          const defaultStartingNumber = 1;
          setLatestInvoiceNumber(`${defaultPrefix}${defaultStartingNumber}`);
        }
      } catch (error) {
        console.error('Error loading invoice settings:', error);
        // Fallback to localStorage sync version
        const savedInvoice = invoiceSettingsStorage.getSync();
        if (savedInvoice) {
          setInvoiceSettings({
            prefix: savedInvoice.prefix || 'O-/',
            startingNumber: savedInvoice.startingNumber || 1,
            autoIncrement: savedInvoice.autoIncrement !== undefined ? savedInvoice.autoIncrement : true,
            defaultPaymentTerms: savedInvoice.defaultPaymentTerms || 30,
            defaultPaymentMethod: savedInvoice.defaultPaymentMethod || 'Bank Transfer',
            startingOrderNumber: savedInvoice.startingOrderNumber,
            startingInvoiceNumber: savedInvoice.startingInvoiceNumber,
          });
          const prefix = savedInvoice.prefix || 'O-/';
          const startingNumber = savedInvoice.startingNumber || 1;
          setLatestInvoiceNumber(`${prefix}${startingNumber}`);
          if (savedInvoice.startingOrderNumber !== undefined && savedInvoice.startingInvoiceNumber !== undefined) {
            setOrderInvoiceMapping({
              orderNumber: savedInvoice.startingOrderNumber.toString(),
              invoiceNumber: `${prefix}${savedInvoice.startingInvoiceNumber}`,
            });
          }
        }
      }
    };

    loadSettings();
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

    try {
      const success = await businessSettingsStorage.save(settingsToSave);
      if (success) {
        toast({
          title: 'Success',
          description: 'Business settings saved successfully',
        });
      } else {
        toast({
          title: 'Warning',
          description: 'Settings saved locally but failed to sync to server',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save business settings',
        variant: 'destructive',
      });
    }
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

  const handleOrderInvoiceMappingChange = (field: 'orderNumber' | 'invoiceNumber', value: string) => {
    const updated = { ...orderInvoiceMapping, [field]: value };
    setOrderInvoiceMapping(updated);
    
    // Parse both fields to extract numbers
    if (updated.orderNumber.trim() && updated.invoiceNumber.trim()) {
      // Extract order number (numeric part)
      const orderMatch = updated.orderNumber.match(/(\d+)(?!.*\d)/);
      const orderNum = orderMatch ? parseInt(orderMatch[1], 10) : null;
      
      // Extract invoice number (prefix and numeric part)
      const invoiceMatch = updated.invoiceNumber.match(/^(.+?)(\d+)$/);
      if (invoiceMatch && orderNum !== null) {
        const prefix = invoiceMatch[1];
        const invoiceNum = parseInt(invoiceMatch[2], 10);
        
        if (!isNaN(invoiceNum) && !isNaN(orderNum) && invoiceNum > 0 && orderNum > 0) {
          // Update settings with the mapping
          setInvoiceSettings({
            ...invoiceSettings,
            prefix: prefix,
            startingOrderNumber: orderNum,
            startingInvoiceNumber: invoiceNum,
          });
        }
      }
    }
  };

  const handleSaveInvoice = async () => {
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

    // Validate order-invoice mapping if provided
    if (orderInvoiceMapping.orderNumber.trim() && orderInvoiceMapping.invoiceNumber.trim()) {
      const orderMatch = orderInvoiceMapping.orderNumber.match(/(\d+)(?!.*\d)/);
      const invoiceMatch = orderInvoiceMapping.invoiceNumber.match(/^(.+?)(\d+)$/);
      
      if (!orderMatch || !invoiceMatch) {
        toast({
          title: 'Validation Error',
          description: 'Please enter valid order number and invoice number for the mapping',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const success = await invoiceSettingsStorage.save(invoiceSettings);
      if (success) {
        toast({
          title: 'Success',
          description: 'Invoice settings saved successfully to Supabase',
        });
      } else {
        toast({
          title: 'Warning',
          description: 'Settings saved to local storage only (Supabase unavailable)',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save invoice settings',
        variant: 'destructive',
      });
    }
  };

  const handleExportOrders = async () => {
    try {
      const orders = await SupabaseService.getOrders();
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
    try {
      const invoices = await SupabaseService.getInvoices();
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

  const handleClearData = async (type: 'orders' | 'invoices' | 'all') => {
    try {
      if (type === 'orders' || type === 'all') {
        // Get all orders and delete them
        const orders = await SupabaseService.getOrders();
        if (orders.length > 0) {
          const orderIds = orders.map(o => o.id);
          await SupabaseService.deleteOrders(orderIds);
        }
      }
      if (type === 'invoices' || type === 'all') {
        // Get all invoices and delete them
        const invoices = await SupabaseService.getInvoices();
        if (invoices.length > 0) {
          const invoiceIds = invoices.map(i => i.id);
          await SupabaseService.deleteInvoices(invoiceIds);
        }
      }

      toast({
        title: 'Success',
        description: `All ${type === 'all' ? 'data' : type} cleared successfully`,
      });
    } catch (error) {
      console.error('Error clearing data:', error);
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

            <div className="space-y-2 md:col-span-2 border-t pt-4">
              <Label className="text-base font-semibold">Order Number to Invoice Number Mapping</Label>
              <p className="text-xs text-muted-foreground mb-4">
                Set the mapping between order numbers and invoice numbers. For example, if order 6244 corresponds to invoice O-/3579, enter both values below. The system will maintain this relationship for all subsequent orders.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startingOrderNumber">Starting Order Number</Label>
                  <Input
                    id="startingOrderNumber"
                    value={orderInvoiceMapping.orderNumber}
                    onChange={(e) => handleOrderInvoiceMappingChange('orderNumber', e.target.value)}
                    placeholder="6244"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the order number (e.g., 6244)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startingInvoiceNumberMapping">Corresponding Invoice Number</Label>
                  <Input
                    id="startingInvoiceNumberMapping"
                    value={orderInvoiceMapping.invoiceNumber}
                    onChange={(e) => handleOrderInvoiceMappingChange('invoiceNumber', e.target.value)}
                    placeholder="O-/3579"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the invoice number for this order (e.g., O-/3579)
                  </p>
                </div>
              </div>
              {invoiceSettings.startingOrderNumber !== undefined && invoiceSettings.startingInvoiceNumber !== undefined && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm">
                    <strong>Mapping Active:</strong> Order {invoiceSettings.startingOrderNumber} → Invoice {invoiceSettings.prefix}{invoiceSettings.startingInvoiceNumber}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: Order {invoiceSettings.startingOrderNumber + 1} will use Invoice {invoiceSettings.prefix}{invoiceSettings.startingInvoiceNumber + 1}
                  </p>
                </div>
              )}
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

