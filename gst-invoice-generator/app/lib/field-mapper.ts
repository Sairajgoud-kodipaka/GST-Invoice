import { CSVRow, InvoiceData, BusinessDetails, PartyDetails, InvoiceMetadata, InvoiceLineItem, ParsedCSVData } from '@/app/types/invoice';
import { businessSettingsStorage, invoiceSettingsStorage } from '@/app/lib/storage';
import { invoiceService } from './invoice-service';

// Default business details (fallback if settings not configured)
const DEFAULT_BUSINESS: BusinessDetails = {
  name: 'Pearls by Mangatrai',
  legalName: 'Mangatrai Gems & Jewels Private Limited',
  address: 'Opp. Liberty Petrol pump, Basheer Bagh',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500063',
  email: 'sales@pearlsbymangatrai.com',
  phone: '+91 91000 09220',
  gstin: '36AAPCM2955G1Z4',
  cin: 'U36900TG2021PTC158093',
  pan: 'AAPCM2955G',
};

// Get business details from settings or use default
function getBusinessDetails(): BusinessDetails {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS;
  
  const saved = businessSettingsStorage.get();
  if (!saved || !saved.name || !saved.gstin) {
    return DEFAULT_BUSINESS;
  }

  // Convert BusinessSettings to BusinessDetails (exclude logoUrl)
  return {
    name: saved.name,
    legalName: saved.legalName,
    address: saved.address,
    city: saved.city,
    state: saved.state,
    pincode: saved.pincode,
    email: saved.email,
    phone: saved.phone,
    gstin: saved.gstin,
    cin: saved.cin,
    pan: saved.pan,
  };
}

// State code mapping
const STATE_CODES: Record<string, string> = {
  'andhra pradesh': '37',
  'arunachal pradesh': '12',
  'assam': '18',
  'bihar': '10',
  'chhattisgarh': '22',
  'goa': '30',
  'gujarat': '24',
  'haryana': '06',
  'himachal pradesh': '02',
  'jharkhand': '20',
  'karnataka': '29',
  'kerala': '32',
  'madhya pradesh': '23',
  'maharashtra': '27',
  'manipur': '14',
  'meghalaya': '17',
  'mizoram': '15',
  'nagaland': '13',
  'odisha': '21',
  'punjab': '03',
  'rajasthan': '08',
  'sikkim': '11',
  'tamil nadu': '33',
  'telangana': '36',
  'tripura': '16',
  'uttar pradesh': '09',
  'uttarakhand': '05',
  'west bengal': '19',
  'delhi': '07',
  'jammu and kashmir': '01',
  'ladakh': '38',
  'puducherry': '34',
  'chandigarh': '04',
  'dadra and nagar haveli and daman and diu': '26',
  'lakshadweep': '31',
  'andaman and nicobar islands': '25',
};

function getStateCode(state: string): string {
  const stateLower = state.toLowerCase().trim();
  return STATE_CODES[stateLower] || '';
}

function findColumn(headers: string[], patterns: string[]): string | null {
  const headersLower = headers.map((h) => h.toLowerCase());
  for (const pattern of patterns) {
    const index = headersLower.findIndex((h) => h.includes(pattern.toLowerCase()));
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
}

function getValue(row: CSVRow, column: string | null): string {
  if (!column) return '';
  return String(row[column] || '').trim();
}

function getNumericValue(row: CSVRow, column: string | null): number {
  const value = getValue(row, column);
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Extract GST rate percentage from tax name (e.g., "IGST 3%" -> 3, "CGST 5%" -> 5)
function extractGSTRateFromName(taxName: string): number {
  if (!taxName) return 0;
  // Match patterns like "IGST 3%", "CGST 5%", "GST 18%", etc.
  const match = taxName.match(/(\d+(?:\.\d+)?)\s*%/i);
  return match ? parseFloat(match[1]) : 0;
}

// Extract invoice number from order number (e.g., "MAN-25-5982" -> "5982")
function extractInvoiceNumber(orderNo: string): string {
  if (!orderNo) return '';
  // Extract the last number sequence from the order number
  // Matches patterns like "MAN-25-5982" -> "5982", "ORDER-123" -> "123"
  const match = orderNo.match(/(\d+)(?!.*\d)/);
  return match ? match[1] : orderNo;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-GB');
  
  // Try to parse various date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return as-is if can't parse
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function mapCSVToInvoice(
  data: ParsedCSVData,
  rowIndex: number = 0,
  invoiceNo?: string
): InvoiceData {
  const row = data.rows[rowIndex];
  const headers = data.headers;

  // Map order metadata
  const orderNoCol = findColumn(headers, ['order number', 'order no', 'order id', 'name']);
  const orderDateCol = findColumn(headers, ['order date', 'created at', 'paid at']);
  const paymentMethodCol = findColumn(headers, ['payment method', 'payment reference']);
  const transportModeCol = findColumn(headers, ['shipping method', 'transport mode', 'fulfillment status']);
  const financialStatusCol = findColumn(headers, ['financial status', 'payment status', 'status']);
  const cancelledAtCol = findColumn(headers, ['cancelled at', 'cancelled date']);

  const orderNo = getValue(row, orderNoCol) || `ORDER-${rowIndex + 1}`;
  const orderDate = formatDate(getValue(row, orderDateCol));
  const invoiceDate = formatDate(new Date().toISOString());
  const paymentMethod = getValue(row, paymentMethodCol) || 'Prepaid';
  const transportMode = getValue(row, transportModeCol) || '';
  
  // Extract financial status and normalize it
  const financialStatusRaw = getValue(row, financialStatusCol)?.toLowerCase() || '';
  let financialStatus: 'paid' | 'pending' | 'unpaid' | 'partially_paid' | 'refunded' | 'voided' | undefined;
  // Check more specific terms first (unpaid, partially_paid) before generic 'paid'
  if (financialStatusRaw.includes('unpaid')) {
    financialStatus = 'unpaid';
  } else if (financialStatusRaw.includes('partially')) {
    financialStatus = 'partially_paid';
  } else if (financialStatusRaw.includes('paid')) {
    financialStatus = 'paid';
  } else if (financialStatusRaw.includes('pending')) {
    financialStatus = 'pending';
  } else if (financialStatusRaw.includes('refund')) {
    financialStatus = 'refunded';
  } else if (financialStatusRaw.includes('void')) {
    financialStatus = 'voided';
  }
  
  const cancelledAt = getValue(row, cancelledAtCol);

  // Map billing party
  const billingNameCol = findColumn(headers, ['billing name', 'name', 'customer name']);
  const billingStreetCol = findColumn(headers, ['billing street', 'billing address1', 'billing address']);
  const billingCityCol = findColumn(headers, ['billing city']);
  const billingZipCol = findColumn(headers, ['billing zip', 'billing pincode']);
  const billingProvinceCol = findColumn(headers, ['billing province', 'billing province name', 'billing state']);
  const billingCountryCol = findColumn(headers, ['billing country']);
  const billingPhoneCol = findColumn(headers, ['billing phone', 'phone']);

  const billingState = getValue(row, billingProvinceCol) || '';
  const billToParty: PartyDetails = {
    name: getValue(row, billingNameCol),
    address: getValue(row, billingStreetCol),
    city: getValue(row, billingCityCol),
    state: billingState,
    stateCode: getStateCode(billingState),
    pincode: getValue(row, billingZipCol),
    country: getValue(row, billingCountryCol) || 'India',
    phone: getValue(row, billingPhoneCol),
  };

  // Map shipping party
  const shippingNameCol = findColumn(headers, ['shipping name', 'billing name', 'name']);
  const shippingStreetCol = findColumn(headers, ['shipping street', 'shipping address1', 'shipping address']);
  const shippingCityCol = findColumn(headers, ['shipping city']);
  const shippingZipCol = findColumn(headers, ['shipping zip', 'shipping pincode']);
  const shippingProvinceCol = findColumn(headers, ['shipping province', 'shipping province name', 'shipping state']);
  const shippingCountryCol = findColumn(headers, ['shipping country']);
  const shippingPhoneCol = findColumn(headers, ['shipping phone', 'phone']);

  const shippingState = getValue(row, shippingProvinceCol) || billingState;
  const shipToParty: PartyDetails = {
    name: getValue(row, shippingNameCol) || billToParty.name,
    address: getValue(row, shippingStreetCol) || billToParty.address,
    city: getValue(row, shippingCityCol) || billToParty.city,
    state: shippingState,
    stateCode: getStateCode(shippingState),
    pincode: getValue(row, shippingZipCol) || billToParty.pincode,
    country: getValue(row, shippingCountryCol) || billToParty.country,
    phone: getValue(row, shippingPhoneCol) || billToParty.phone,
  };

  // Map line items - use values directly from CSV (no calculations)
  const lineItemNameCol = findColumn(headers, ['lineitem name', 'product name', 'item name']);
  const lineItemSkuCol = findColumn(headers, ['lineitem sku', 'sku', 'variant sku']);
  const lineItemQtyCol = findColumn(headers, ['lineitem quantity', 'quantity', 'qty']);
  const lineItemPriceCol = findColumn(headers, ['lineitem price', 'price', 'unit price']);
  const lineItemDiscountCol = findColumn(headers, ['lineitem discount', 'discount', 'discount amount']);
  const taxableAmountCol = findColumn(headers, ['taxable amount', 'lineitem taxable', 'subtotal']);
  const hsnCol = findColumn(headers, ['hsn', 'hsn code', 'tax code']);
  // Try to get GST rate from Tax 1 Name first (e.g., "IGST 3%" -> 3), then fall back to other columns
  const tax1NameCol = findColumn(headers, ['tax 1 name']);
  const tax2NameCol = findColumn(headers, ['tax 2 name']);
  const gstRateCol = findColumn(headers, ['gst rate', 'tax rate']);
  const tax1ValueCol = findColumn(headers, ['tax 1 value']);
  const tax2ValueCol = findColumn(headers, ['tax 2 value']);
  const cgstCol = findColumn(headers, ['cgst', 'cgst amount']);
  const sgstCol = findColumn(headers, ['sgst', 'sgst amount']);
  const igstCol = findColumn(headers, ['igst', 'igst amount']);
  const lineItemTotalCol = findColumn(headers, ['lineitem total', 'total', 'item total']);

  const lineItems: InvoiceLineItem[] = [];
  
  if (lineItemNameCol) {
    const itemName = getValue(row, lineItemNameCol);
    const sku = getValue(row, lineItemSkuCol) || itemName;
    const quantity = getNumericValue(row, lineItemQtyCol) || 1;
    const ratePerItem = getNumericValue(row, lineItemPriceCol);
    // Get discount from CSV - use lineitem discount if available, otherwise use order-level discount divided by quantity
    const lineItemDiscount = getNumericValue(row, lineItemDiscountCol);
    const orderDiscountCol = findColumn(headers, ['discount amount', 'total discount', 'discount']);
    const orderDiscount = getNumericValue(row, orderDiscountCol) || 0;
    const discountPerItem = lineItemDiscount > 0 
      ? (quantity > 0 ? lineItemDiscount / quantity : 0)
      : (quantity > 0 ? orderDiscount / quantity : 0);
    const hsn = getValue(row, hsnCol) || '711319';
    
    // Extract GST rate: prefer Tax 1 Name (e.g., "IGST 3%"), then gst rate column
    // NEVER use Tax 1 Value as percentage - it's a tax amount, not a rate!
    let gstRate = 0;
    if (tax1NameCol) {
      const tax1Name = getValue(row, tax1NameCol);
      gstRate = extractGSTRateFromName(tax1Name);
    }
    if (gstRate === 0 && gstRateCol) {
      const rateValue = getNumericValue(row, gstRateCol);
      // Only use if it's a reasonable percentage (0-100), not a tax amount
      if (rateValue > 0 && rateValue <= 100) {
        gstRate = rateValue;
      }
    }
    
    // Extract tax values from CSV columns first
    let cgst = getNumericValue(row, cgstCol);
    let sgst = getNumericValue(row, sgstCol);
    let igst = getNumericValue(row, igstCol);
    
    // If direct CGST/SGST/IGST columns don't exist, extract from Tax 1 Name/Value and Tax 2 Name/Value
    if ((cgst === 0 && sgst === 0 && igst === 0) && tax1NameCol && tax1ValueCol) {
      const tax1Name = getValue(row, tax1NameCol).toUpperCase();
      const tax1Value = getNumericValue(row, tax1ValueCol);
      
      if (tax1Name.includes('CGST') && tax1Value > 0) {
        cgst = tax1Value;
      } else if (tax1Name.includes('SGST') && tax1Value > 0) {
        sgst = tax1Value;
      } else if (tax1Name.includes('IGST') && tax1Value > 0) {
        igst = tax1Value;
      }
      
      // Check Tax 2 Name/Value if available
      if (tax2NameCol && tax2ValueCol) {
        const tax2Name = getValue(row, tax2NameCol).toUpperCase();
        const tax2Value = getNumericValue(row, tax2ValueCol);
        
        if (tax2Name.includes('CGST') && tax2Value > 0) {
          cgst = tax2Value;
        } else if (tax2Name.includes('SGST') && tax2Value > 0) {
          sgst = tax2Value;
        } else if (tax2Name.includes('IGST') && tax2Value > 0) {
          igst = tax2Value;
        }
      }
    }
    
    const tax1Value = getNumericValue(row, tax1ValueCol);
    
    // Get order-level values from CSV (use these directly, no calculations)
    const orderSubtotalCol = findColumn(headers, ['subtotal', 'total before tax', 'taxable amount']);
    const orderTotalCol = findColumn(headers, ['total', 'total amount', 'total amount after tax', 'grand total']);
    const orderSubtotal = getNumericValue(row, orderSubtotalCol) || 0;
    const orderTotal = getNumericValue(row, orderTotalCol) || 0;
    const orderTaxCol = findColumn(headers, ['taxes', 'total tax', 'tax amount']);
    const orderTax = getNumericValue(row, orderTaxCol) || 0;
    
    // Use CSV values directly - no calculations
    // For line items, use order-level values if line-item specific values are not available
    const lineItemTotal = getNumericValue(row, lineItemTotalCol);
    const total = lineItemTotal > 0 ? lineItemTotal : orderTotal;
    
    // Use taxable amount from CSV directly - no calculations
    // Use from CSV column if available, otherwise use order subtotal
    const taxableAmount = getNumericValue(row, taxableAmountCol) || orderSubtotal;

    lineItems.push({
      sno: 1,
      itemName,
      sku,
      quantity,
      ratePerItem,
      discountPerItem,
      taxableAmount, // Use from CSV
      hsn,
      gstRate,
      cgst: cgst || undefined,
      sgst: sgst || undefined,
      igst: igst || undefined,
      total, // Use from CSV
    });
  }

  // Extract all metafields from CSV
  const metafields: Record<string, string | number> = {};
  for (const field of data.metafields) {
    const value = row[field];
    if (value !== undefined && value !== '') {
      metafields[field] = value;
    }
  }
  
  // Also include all other CSV columns as metafields
  for (const header of headers) {
    if (!metafields[header] && row[header] !== undefined && row[header] !== '') {
      metafields[header] = row[header] as string | number;
    }
  }

  // Get totals directly from CSV (no calculations)
  const subtotalCol = findColumn(headers, ['subtotal', 'total before tax', 'taxable amount']);
  const discountAmountCol = findColumn(headers, ['discount amount', 'total discount', 'discount']);
  const discountPercentCol = findColumn(headers, ['discount %', 'discount percent', 'discount percentage']);
  const totalTaxCol = findColumn(headers, ['total tax', 'tax amount', 'taxes']);
  const totalCgstCol = findColumn(headers, ['total cgst', 'cgst total']);
  const totalSgstCol = findColumn(headers, ['total sgst', 'sgst total']);
  const totalIgstCol = findColumn(headers, ['total igst', 'igst total']);
  const totalAmountCol = findColumn(headers, ['total', 'total amount', 'total amount after tax', 'grand total']);

  const subtotal = getNumericValue(row, subtotalCol) || 0;
  const discountAmount = getNumericValue(row, discountAmountCol) || 0;
  const discountPercent = getNumericValue(row, discountPercentCol);
  const totalTaxAmount = getNumericValue(row, totalTaxCol) || 0;
  const totalCgst = getNumericValue(row, totalCgstCol);
  const totalSgst = getNumericValue(row, totalSgstCol);
  const totalIgst = getNumericValue(row, totalIgstCol);
  const totalAmountAfterTax = getNumericValue(row, totalAmountCol) || 0; // Use from CSV only, no calculation

  // Create invoice metadata - invoice number should be provided by caller
  // Falls back to order-based mapping or localStorage if not provided
  let finalInvoiceNo = invoiceNo;
  if (!finalInvoiceNo) {
    // Try to get invoice number from order number mapping first
    // Using sync version for compatibility (will use localStorage cache or Supabase via API)
    if (orderNo) {
      finalInvoiceNo = invoiceSettingsStorage.getInvoiceNumberFromOrderNumberSync(orderNo);
    } else {
      finalInvoiceNo = invoiceSettingsStorage.getNextInvoiceNumberSync();
    }
  }
  
  const metadata: InvoiceMetadata = {
    invoiceNo: finalInvoiceNo,
    orderNo: orderNo,
    invoiceDate,
    orderDate,
    placeOfSupply: shipToParty.city || shipToParty.state || 'N/A',
    transportMode: transportMode,
    paymentMethod,
    state: shipToParty.state || getBusinessDetails().state,
    stateCode: shipToParty.stateCode || getBusinessDetails().gstin.substring(0, 2),
    financialStatus,
    cancelledAt: cancelledAt || undefined,
  };

  const business = getBusinessDetails();

  return {
    business,
    metadata,
    billToParty,
    shipToParty,
    lineItems,
    taxSummary: {
      subtotal, // From CSV
      discountPercent: discountPercent || undefined, // From CSV
      discountAmount, // From CSV
      totalTaxableAmount: subtotal, // Use subtotal from CSV (no calculation)
      totalCgst: totalCgst || undefined, // From CSV
      totalSgst: totalSgst || undefined, // From CSV
      totalIgst: totalIgst || undefined, // From CSV
      totalTaxAmount, // From CSV
      totalAmountAfterTax, // From CSV - no round off
    },
    amountInWords: '',
    metafields: Object.keys(metafields).length > 0 ? metafields : undefined,
  };
}

export function mapMultipleOrders(data: ParsedCSVData): InvoiceData[] {
  const headers = data.headers;
  
  // Find order number column
  const orderNoCol = findColumn(headers, ['order number', 'order no', 'order id', 'name']);
  
  // Group rows by order number
  const orderGroups = new Map<string, number[]>();
  
  data.rows.forEach((row, index) => {
    const orderNo = getValue(row, orderNoCol) || `ORDER-${index + 1}`;
    if (!orderGroups.has(orderNo)) {
      orderGroups.set(orderNo, []);
    }
    orderGroups.get(orderNo)!.push(index);
  });
  
  // For each unique order number, create one invoice with combined line items
  const invoices: InvoiceData[] = [];
  
  orderGroups.forEach((rowIndices, orderNo) => {
    // Find the row with the most complete information (has customer details, billing, totals)
    // Usually the first row has all the order-level info
    let primaryRowIndex = rowIndices[0];
    
    // Try to find a row with customer/billing information
    for (const index of rowIndices) {
      const row = data.rows[index];
      const billingNameCol = findColumn(headers, ['billing name', 'name', 'customer name']);
      const billingName = getValue(row, billingNameCol);
      
      if (billingName && billingName.trim() !== '') {
        primaryRowIndex = index;
        break;
      }
    }
    
    // Create base invoice from primary row
    const baseInvoice = mapCSVToInvoice(data, primaryRowIndex);
    
    // Get order-level GST rate from primary row (to apply to all line items if they don't have their own)
    const primaryRow = data.rows[primaryRowIndex];
    const tax1NameCol = findColumn(headers, ['tax 1 name']);
    const tax2NameCol = findColumn(headers, ['tax 2 name']);
    const gstRateCol = findColumn(headers, ['gst rate', 'tax rate']);
    let orderLevelGstRate = 0;
    if (tax1NameCol) {
      const tax1Name = getValue(primaryRow, tax1NameCol);
      orderLevelGstRate = extractGSTRateFromName(tax1Name);
    }
    if (orderLevelGstRate === 0 && gstRateCol) {
      const rateValue = getNumericValue(primaryRow, gstRateCol);
      if (rateValue > 0 && rateValue <= 100) {
        orderLevelGstRate = rateValue;
      }
    }
    
    // Collect all line items from all rows with this order number
    const allLineItems: InvoiceLineItem[] = [];
    let itemSno = 1;
    
    const lineItemNameCol = findColumn(headers, ['lineitem name', 'product name', 'item name']);
    const lineItemSkuCol = findColumn(headers, ['lineitem sku', 'sku', 'variant sku']);
    const lineItemQtyCol = findColumn(headers, ['lineitem quantity', 'quantity', 'qty']);
    const lineItemPriceCol = findColumn(headers, ['lineitem price', 'price', 'unit price']);
    const lineItemDiscountCol = findColumn(headers, ['lineitem discount', 'discount', 'discount amount']);
    const taxableAmountCol = findColumn(headers, ['taxable amount', 'lineitem taxable', 'subtotal']);
    const hsnCol = findColumn(headers, ['hsn', 'hsn code', 'tax code']);
    const tax1ValueCol = findColumn(headers, ['tax 1 value']);
    const tax2ValueCol = findColumn(headers, ['tax 2 value']);
    const cgstCol = findColumn(headers, ['cgst', 'cgst amount']);
    const sgstCol = findColumn(headers, ['sgst', 'sgst amount']);
    const igstCol = findColumn(headers, ['igst', 'igst amount']);
    const lineItemTotalCol = findColumn(headers, ['lineitem total', 'total', 'item total']);
    
    for (const index of rowIndices) {
      const row = data.rows[index];
      
      if (lineItemNameCol) {
        const itemName = getValue(row, lineItemNameCol);
        if (itemName && itemName.trim() !== '') {
          const sku = getValue(row, lineItemSkuCol) || itemName;
          const quantity = getNumericValue(row, lineItemQtyCol) || 1;
          const ratePerItem = getNumericValue(row, lineItemPriceCol);
          const discountPerItem = quantity > 0 ? getNumericValue(row, lineItemDiscountCol) / quantity : 0;
          const hsn = getValue(row, hsnCol) || '711319';
          
          // Extract GST rate: prefer Tax 1 Name (e.g., "IGST 3%"), then gst rate column
          // If line item doesn't have GST rate, inherit from order-level GST rate
          // NEVER use Tax 1 Value as percentage - it's a tax amount, not a rate!
          let gstRate = 0;
          if (tax1NameCol) {
            const tax1Name = getValue(row, tax1NameCol);
            gstRate = extractGSTRateFromName(tax1Name);
          }
          if (gstRate === 0 && gstRateCol) {
            const rateValue = getNumericValue(row, gstRateCol);
            // Only use if it's a reasonable percentage (0-100), not a tax amount
            if (rateValue > 0 && rateValue <= 100) {
              gstRate = rateValue;
            }
          }
          // If still no GST rate found, inherit from order-level GST rate
          if (gstRate === 0 && orderLevelGstRate > 0) {
            gstRate = orderLevelGstRate;
          }
          
          // Extract tax values from CSV columns first
          let cgst = getNumericValue(row, cgstCol);
          let sgst = getNumericValue(row, sgstCol);
          let igst = getNumericValue(row, igstCol);
          
          // If direct CGST/SGST/IGST columns don't exist, extract from Tax 1 Name/Value and Tax 2 Name/Value
          if ((cgst === 0 && sgst === 0 && igst === 0) && tax1NameCol && tax1ValueCol) {
            const tax1Name = getValue(row, tax1NameCol).toUpperCase();
            const tax1Value = getNumericValue(row, tax1ValueCol);
            
            if (tax1Name.includes('CGST') && tax1Value > 0) {
              cgst = tax1Value;
            } else if (tax1Name.includes('SGST') && tax1Value > 0) {
              sgst = tax1Value;
            } else if (tax1Name.includes('IGST') && tax1Value > 0) {
              igst = tax1Value;
            }
            
            // Check Tax 2 Name/Value if available
            if (tax2NameCol && tax2ValueCol) {
              const tax2Name = getValue(row, tax2NameCol).toUpperCase();
              const tax2Value = getNumericValue(row, tax2ValueCol);
              
              if (tax2Name.includes('CGST') && tax2Value > 0) {
                cgst = tax2Value;
              } else if (tax2Name.includes('SGST') && tax2Value > 0) {
                sgst = tax2Value;
              } else if (tax2Name.includes('IGST') && tax2Value > 0) {
                igst = tax2Value;
              }
            }
          }
          
          const tax1Value = getNumericValue(row, tax1ValueCol);
          
          // Fetch Total from CSV - try order-level Total column first, then lineitem total
          const orderTotalCol = findColumn(headers, ['total', 'total amount', 'total amount after tax', 'grand total']);
          const orderTotal = getNumericValue(row, orderTotalCol);
          const lineItemTotal = getNumericValue(row, lineItemTotalCol);
          // Use order-level Total if available, otherwise use lineitem total, otherwise 0
          const total = orderTotal > 0 ? orderTotal : (lineItemTotal > 0 ? lineItemTotal : 0);
          
          // If we have tax values from CSV, taxable amount = total (tax is included in total)
          // Otherwise, calculate taxable amount normally
          let taxableAmount: number;
          if ((cgst || sgst || igst) && total > 0) {
            // Tax is included: taxable amount = total (from CSV)
            taxableAmount = total;
          } else if ((cgst || sgst || igst) && total === 0) {
            // Tax from CSV but no total - use subtotal as taxable amount
            taxableAmount = getNumericValue(row, taxableAmountCol) || (ratePerItem * quantity - getNumericValue(row, lineItemDiscountCol));
          } else if (tax1Value > 0 && tax1ValueCol) {
            // Tax is included in price: taxableAmount = (ratePerItem - tax1Value/quantity) * quantity - discount
            const taxPerItem = tax1Value / quantity;
            taxableAmount = (ratePerItem - taxPerItem) * quantity - getNumericValue(row, lineItemDiscountCol);
          } else {
            // Normal case: use from CSV or calculate
            taxableAmount = getNumericValue(row, taxableAmountCol) || (ratePerItem * quantity - getNumericValue(row, lineItemDiscountCol));
          }
          
          allLineItems.push({
            sno: itemSno++,
            itemName,
            sku,
            quantity,
            ratePerItem,
            discountPerItem,
            taxableAmount,
            hsn,
            gstRate,
            cgst: cgst || undefined,
            sgst: sgst || undefined,
            igst: igst || undefined,
            total,
          });
        }
      }
    }
    
    // Use line items from primary row if no line items were found, otherwise use combined items
    if (allLineItems.length === 0 && baseInvoice.lineItems.length > 0) {
      // Keep the base invoice as is
      invoices.push(baseInvoice);
    } else if (allLineItems.length > 0) {
      // Calculate totals from combined line items
      const combinedSubtotal = allLineItems.reduce((sum, item) => sum + item.taxableAmount, 0);
      const combinedDiscount = allLineItems.reduce((sum, item) => sum + (item.discountPerItem * item.quantity), 0);
      const combinedCgst = allLineItems.reduce((sum, item) => sum + (item.cgst || 0), 0);
      const combinedSgst = allLineItems.reduce((sum, item) => sum + (item.sgst || 0), 0);
      const combinedIgst = allLineItems.reduce((sum, item) => sum + (item.igst || 0), 0);
      const combinedTotal = allLineItems.reduce((sum, item) => sum + item.total, 0);
      
      // Use totals from primary row if available, otherwise calculate from line items
      const primaryRow = data.rows[primaryRowIndex];
      const totalAmountCol = findColumn(headers, ['total', 'total amount', 'total amount after tax', 'grand total']);
      const totalAmountFromCSV = getNumericValue(primaryRow, totalAmountCol);
      
      // Create combined invoice
      const combinedInvoice: InvoiceData = {
        ...baseInvoice,
        lineItems: allLineItems,
        taxSummary: {
          ...baseInvoice.taxSummary,
          subtotal: totalAmountFromCSV > 0 ? baseInvoice.taxSummary.subtotal : combinedSubtotal,
          discountAmount: baseInvoice.taxSummary.discountAmount || combinedDiscount,
          totalTaxableAmount: totalAmountFromCSV > 0 
            ? baseInvoice.taxSummary.totalTaxableAmount 
            : combinedSubtotal - combinedDiscount,
          totalCgst: baseInvoice.taxSummary.totalCgst || (combinedCgst > 0 ? combinedCgst : undefined),
          totalSgst: baseInvoice.taxSummary.totalSgst || (combinedSgst > 0 ? combinedSgst : undefined),
          totalIgst: baseInvoice.taxSummary.totalIgst || (combinedIgst > 0 ? combinedIgst : undefined),
          totalTaxAmount: baseInvoice.taxSummary.totalTaxAmount || (combinedCgst + combinedSgst + combinedIgst),
          totalAmountAfterTax: totalAmountFromCSV > 0 ? totalAmountFromCSV : combinedTotal,
        },
      };
      
      invoices.push(combinedInvoice);
    } else {
      // Fallback: use base invoice
      invoices.push(baseInvoice);
    }
  });
  
  return invoices;
}