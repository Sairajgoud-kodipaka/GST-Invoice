'use client';

import { useState, useEffect, useRef } from 'react';
import { InvoiceData } from '@/app/types/invoice';
import { formatCurrency } from '@/app/lib/invoice-formatter';

interface InvoiceTemplateProps {
  invoice: InvoiceData;
  hidePageNumbers?: boolean;
}

export function InvoiceTemplate({ invoice, hidePageNumbers = false }: InvoiceTemplateProps) {
  const {
    business,
    metadata,
    billToParty,
    shipToParty,
    lineItems,
    taxSummary,
    amountInWords,
  } = invoice;

  const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = taxSummary.totalAmountAfterTax;
  const website = business.email
    ? business.email.split('@')[1]
    : 'pearlsbymangatrai.com';

  // for extra empty rows (to mimic fixed-height table in PDF)
  const MIN_ROWS = 5;
  const emptyRows =
    lineItems.length < MIN_ROWS ? MIN_ROWS - lineItems.length : 0;

  const formatAmount = (value: number) =>
    value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Determine stamp type based on financial status and cancellation
  const getStampType = (): 'paid' | 'unpaid' | 'pending' | 'cancelled' | null => {
    if (metadata.cancelledAt) {
      return 'cancelled';
    }
    if (metadata.financialStatus === 'paid') {
      return 'paid';
    }
    if (metadata.financialStatus === 'pending' || metadata.financialStatus === 'partially_paid') {
      return 'pending';
    }
    if (metadata.financialStatus === 'unpaid' || metadata.financialStatus === 'voided' || metadata.financialStatus === 'refunded') {
      return 'unpaid';
    }
    // Default to paid if no status is provided (backward compatibility)
    return metadata.financialStatus ? null : 'paid';
  };

  const stampType = getStampType();

  // Dynamic pagination state - for client-side rendering
  // For print/PDF, CSS counters will handle page numbers automatically
  const isClient = typeof window !== 'undefined';
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const invoicePageRef = useRef<HTMLDivElement>(null);

  // Calculate page numbers for screen view (only on client)
  useEffect(() => {
    if (!isClient || !invoicePageRef.current) {
      // Server-side: default to 1 page
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }
    
    const calculatePages = () => {
      const pageElement = invoicePageRef.current;
      if (!pageElement) return;
      
      // A4 page height: 297mm = 1122.52px (at 96 DPI)
      // Account for padding: 8mm top + 8mm bottom = 16mm = 60.47px
      // Usable height: 297mm - 16mm = 281mm = 1062.05px
      // Also account for footer space: ~20px
      const pageHeight = 1040; // Approximate usable height in pixels
      const contentHeight = pageElement.scrollHeight;
      const calculatedPages = Math.max(1, Math.ceil(contentHeight / pageHeight));
      
      setTotalPages(calculatedPages);
      setCurrentPage(1); // For single-page view, always show page 1
    };
    
    // Calculate on mount and resize
    calculatePages();
    const resizeTimer = setTimeout(calculatePages, 100); // Small delay for layout
    
    window.addEventListener('resize', calculatePages);
    
    // Use ResizeObserver for more accurate detection
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(calculatePages, 100);
    });
    resizeObserver.observe(invoicePageRef.current);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', calculatePages);
      resizeObserver.disconnect();
    };
  }, [invoice, isClient]);

  return (
    <div
      className="invoice-template bg-white text-black"
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        lineHeight: 1.3,
        margin: 0,
        padding: 0,
      }}
    >
      {/* A4 page with margins similar to PDF */}
      <div
        ref={invoicePageRef}
        className="mx-auto invoice-page"
        style={{
          width: '210mm',
          maxWidth: '210mm',
          height: 'auto',
          minHeight: 'auto',
          maxHeight: '297mm',
          padding: '8mm', // Equal padding on all sides
          border: '2.5px solid #000',
          position: 'relative',
          boxSizing: 'border-box',
          margin: '0 auto',
          backgroundColor: 'white',
          overflow: 'visible', // Changed from hidden
        }}
      >
        {/* ======== TOP HEADER (exact like PDF) ======== */}
        {/* Row 1: Tax Invoice (left) | ORIGINAL + PAN (right) */}
        <div
          className="flex justify-between items-start"
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '4px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                margin: 0,
                marginBottom: '3px',
                lineHeight: '1.2',
              }}
            >
              Tax Invoice
            </h1>
            <div style={{ fontSize: '9px', lineHeight: '1.3' }}>
              <p style={{ margin: 0, marginBottom: '3px' }}>
                <span style={{ fontWeight: 600 }}>GSTIN :</span>{' '}
                {business.gstin}
              </p>
              {business.cin && (
                <p style={{ margin: 0 }}>
                  <span style={{ fontWeight: 600 }}>CIN :</span> {business.cin}
                </p>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                margin: 0,
                fontSize: '9px',
                marginBottom: '3px',
                lineHeight: '1.3',
              }}
            >
              ORIGINAL
            </p>
            {business.pan && (
              <p style={{ margin: 0, fontSize: '9px', lineHeight: '1.3' }}>
                <span style={{ fontWeight: 600 }}>PAN NO.:</span> {business.pan}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Logo centered */}
        <div
          className="flex justify-center"
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: '-40px',
            marginBottom: '3px',
          }}
        >
          <img
            src="/logo-Photoroom.png"
            alt="Pearls by Mangatrai Logo"
            style={{ maxWidth: '130px', height: 'auto' }}
          />
        </div>

        {/* Row 3: Brand name + legal name (centered) */}
        <div style={{ textAlign: 'center', marginBottom: '2px' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 'bold',
              marginBottom: '2px',
              lineHeight: '1.2',
            }}
          >
            {business.name}
          </div>
          <div style={{ fontSize: '10px', lineHeight: '1.3' }}>{business.legalName}</div>
        </div>

        {/* Row 4: Address (center) */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '9px',
            marginBottom: '3px',
            lineHeight: '1.3',
          }}
        >
          {business.address}, {business.city} - {business.pincode},{' '}
          {business.state}, India
        </div>

        {/* Row 5: Email | Website | Phone (center in a row) */}
        <div
          className="flex justify-center"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            fontSize: '8px',
            marginTop: '2px',
            marginBottom: '3px',
            alignItems: 'center',
            lineHeight: '1.2',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>📧</span>
            <span style={{ fontWeight: 'bold', color: '#000' }}>{business.email}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>🔗</span>
            <span style={{ fontWeight: 'bold', color: '#000' }}>{website}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>☎</span>
            <span style={{ fontWeight: 'bold', color: '#000' }}>{business.phone}</span>
          </span>
        </div>

        {/* Divider line (thicker like PDF) */}
        <div
          style={{
            borderTop: '2px solid #000',
            marginTop: '4px',
            marginBottom: '4px',
          }}
        />

        {/* ======== INVOICE META TABLE (3x3 grid like PDF) ======== */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '8px',
            marginBottom: '2px',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '3px 4px',
                  width: '33.33%',
                }}
              >
                <span style={{ fontWeight: 600 }}>Invoice No:</span>{' '}
                {metadata.invoiceNo}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '3px 4px',
                  width: '33.33%',
                }}
              >
                <span style={{ fontWeight: 600 }}>Order No:</span>{' '}
                {metadata.orderNo}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '3px 4px',
                  width: '33.33%',
                }}
              >
                <span style={{ fontWeight: 600 }}>Transport Mode:</span>{' '}
                {metadata.transportMode || 'DTDC Air 500gm'}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>
                <span style={{ fontWeight: 600 }}>Invoice Date:</span>{' '}
                {metadata.invoiceDate}
              </td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>
                <span style={{ fontWeight: 600 }}>Order Date:</span>{' '}
                {metadata.orderDate}
              </td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>
                <span style={{ fontWeight: 600 }}>Date of Supply:</span>
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>
                <span style={{ fontWeight: 600 }}>State:</span>{' '}
                {metadata.state}
              </td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>
                <span style={{ fontWeight: 600 }}>Code:</span>{' '}
                {metadata.stateCode}
              </td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>
                <span style={{ fontWeight: 600 }}>Place of Supply:</span>{' '}
                {metadata.placeOfSupply}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ======== BILL TO / SHIP TO TABLE (exact 2-column box) ======== */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '8px',
            marginBottom: '2px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8' }}>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  fontWeight: 600,
                  width: '50%',
                }}
              >
                BILL TO PARTY
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  fontWeight: 600,
                  width: '50%',
                }}
              >
                SHIP TO PARTY / DELIVERY ADDRESS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Bill To cell */}
              <td
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  verticalAlign: 'top',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>{billToParty.name}</div>
                <div style={{ marginBottom: '1px' }}>{billToParty.address}</div>
                {billToParty.city && <div style={{ marginBottom: '1px' }}>{billToParty.city}</div>}
                <div style={{ marginBottom: '1px' }}>Pin code - {billToParty.pincode}</div>
                {billToParty.phone && <div style={{ marginBottom: '1px' }}>Phone: {billToParty.phone}</div>}
                <div style={{ marginBottom: '1px' }}>GSTIN: {billToParty.gstin || '-'}</div>
                <div>
                  State: {billToParty.state} &nbsp; Code {billToParty.stateCode}{' '}
                  &nbsp; Country: {billToParty.country}
                </div>
              </td>

              {/* Ship To cell */}
              <td
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  verticalAlign: 'top',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>{shipToParty.name}</div>
                <div style={{ marginBottom: '1px' }}>{shipToParty.address}</div>
                {shipToParty.city && <div style={{ marginBottom: '1px' }}>{shipToParty.city}</div>}
                <div style={{ marginBottom: '1px' }}>Pin code - {shipToParty.pincode}</div>
                {shipToParty.phone && <div style={{ marginBottom: '1px' }}>Phone: {shipToParty.phone}</div>}
                <div style={{ marginBottom: '1px' }}>GSTIN: {shipToParty.gstin || '-'}</div>
                <div>
                  State: {shipToParty.state} &nbsp; Code {shipToParty.stateCode}{' '}
                  &nbsp; Country: {shipToParty.country}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ======== LINE ITEMS TABLE (like PDF) ======== */}
        <table
          className="line-items-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '8px',
            marginBottom: '2px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#e8e8e8' }}>
              <th style={{ border: '1px solid #000', padding: '4px', width: '3%' }}>#</th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'left',
                  width: '25%',
                }}
              >
                ITEM - SKU
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  width: '5%',
                }}
              >
                QTY
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                  width: '10%',
                }}
              >
                RATE PER ITEM (₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                  width: '10%',
                }}
              >
                DISCOUNT (ITEM ₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                  width: '10%',
                }}
              >
                TAXABLE (ITEM ₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  width: '8%',
                }}
              >
                HSN
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  width: '7%',
                }}
              >
                GST (%)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                  width: '10%',
                }}
              >
                IGST (₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                  width: '12%',
                }}
              >
                TOTAL (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.sno}>
                <td style={{ border: '1px solid #000', padding: '4px' }}>
                  {item.sno}
                </td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>
                  {item.itemName} - {item.sku}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'center',
                  }}
                >
                  {item.quantity}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'right',
                  }}
                >
                  {formatAmount(item.ratePerItem)}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'right',
                  }}
                >
                  {formatAmount(item.discountPerItem)}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'right',
                  }}
                >
                  {formatAmount(item.taxableAmount)}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'center',
                  }}
                >
                  {item.hsn}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'center',
                  }}
                >
                  {item.gstRate}%
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'right',
                  }}
                >
                  {item.igst
                    ? formatAmount(item.igst)
                    : item.cgst || item.sgst
                    ? formatAmount((item.cgst || 0) + (item.sgst || 0))
                    : '-'}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    textAlign: 'right',
                  }}
                >
                  {formatAmount(item.total)}
                </td>
              </tr>
            ))}

            {/* Extra empty rows for visual match */}
            {Array.from({ length: emptyRows }).map((_, idx) => (
              <tr key={`empty-${idx}`}>
                {Array.from({ length: 10 }).map((__, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      height: '12px',
                    }}
                  />
                ))}
              </tr>
            ))}

            {/* TOTAL ROW (like PDF) */}
            <tr style={{ backgroundColor: '#e8e8e8', fontWeight: 700 }}>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  fontWeight: 700,
                }}
              >
                TOTAL
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                {totalQuantity}
              </td>
              <td
                colSpan={6}
                style={{ border: '1px solid #000', padding: '4px' }}
              />
              <td
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                  fontWeight: 700,
                }}
              >
                {formatAmount(
                  lineItems.reduce((sum, item) => sum + item.total, 0),
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ======== PAYMENT + TERMS + TOTALS SECTION (two-column row) ======== */}
        <div
          className="grid grid-cols-2 gap-4 mb-2"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '12px',
            marginBottom: '4px',
          }}
        >
          {/* LEFT: Payment mode + T&C + Amount in words (single box like PDF) */}
          <div>
            {/* Payment mode line */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '8px',
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Payment Mode:</span>{' '}
                    {metadata.paymentMethod}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Terms & conditions + amount in words box */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '8px',
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      borderLeft: '1px solid #000',
                      borderRight: '1px solid #000',
                      padding: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Terms and Conditions
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderLeft: '1px solid #000',
                      borderRight: '1px solid #000',
                      padding: '4px',
                      fontSize: '7px',
                    }}
                  >
                    For T&C visit:{' '}
                    <span>
                      https://pearlsbymangatrai.com/page/terms-and-conditions
                      for Refund &amp; Exchange Policy visit:
                      https://pearlsbymangatrai.com/page/returns-and-cancellation-policy
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      fontSize: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                      Total Invoice Amount in Words
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '10px' }}>
                      {amountInWords}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT: Totals box (exact labels like PDF) */}
          <div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '8px',
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                    }}
                  >
                    Total amount before Tax(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      textAlign: 'right',
                    }}
                  >
                    {formatAmount(taxSummary.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                    }}
                  >
                    Total Tax amount(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      textAlign: 'right',
                    }}
                  >
                    {formatAmount(taxSummary.totalTaxAmount)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                    }}
                  >
                    Discount
                    {taxSummary.discountPercent
                      ? ` (${taxSummary.discountPercent.toFixed(2)}%)`
                      : ''}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      textAlign: 'right',
                    }}
                  >
                    {taxSummary.discountAmount > 0
                      ? formatAmount(taxSummary.discountAmount)
                      : '0.00'}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                    }}
                  >
                    Shipping amount(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      textAlign: 'right',
                    }}
                  >
                    -
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                    }}
                  >
                    Total amount after Tax(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      textAlign: 'right',
                    }}
                  >
                    {formatAmount(taxSummary.totalAmountAfterTax)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                    }}
                  >
                    Round off
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      textAlign: 'right',
                    }}
                  >
                    0.00
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      fontWeight: 700,
                    }}
                  >
                    TOTAL(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '4px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    {formatAmount(finalTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ======== FOOTER: E&O, PAID stamp, signature (layout like PDF) ======== */}
        <div
          style={{
            marginTop: '8px',
            borderTop: '1px solid #999',
            paddingTop: '4px',
            fontSize: '8px',
            paddingBottom: '20px', // Space for bottom footer text
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 600 }}>E & O.E</div>

          {/* Fixed footer band with aligned items */}
          <div
            className="flex justify-between items-center"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: '55px',
            }}
          >
            {/* Left section with E&O.E and PAID stamp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '0 0 auto' }}>
              {/* PAID stamp (center-left) */}
            {stampType && (
              <div
                style={{
                  position: 'relative',
                  width: '100px',
                    height: '55px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                      top: '65%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-20deg)',
                    width: '100px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `4px solid ${
                      stampType === 'paid'
                        ? '#2563eb'
                        : stampType === 'cancelled'
                        ? '#dc2626'
                        : stampType === 'pending'
                        ? '#f59e0b'
                        : '#6b7280'
                    }`,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    opacity: 0.85,
                  }}
                >
                  <span
                    style={{
                      color:
                        stampType === 'paid'
                          ? '#2563eb'
                          : stampType === 'cancelled'
                          ? '#dc2626'
                          : stampType === 'pending'
                          ? '#f59e0b'
                          : '#6b7280',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      letterSpacing: '2px',
                    }}
                  >
                    {stampType === 'paid'
                      ? 'PAID'
                      : stampType === 'cancelled'
                      ? 'CANCELLED'
                      : stampType === 'pending'
                      ? 'PENDING'
                      : 'UNPAID'}
                  </span>
                </div>
              </div>
            )}
            </div>

            {/* Empty center space */}
            <div style={{ flex: 1 }} />

            {/* Signature text (right) */}
            <div style={{ textAlign: 'right', fontSize: '8px', marginTop: '8px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                For, {business.legalName}
              </div>
              <div style={{ color: '#666', fontSize: '7px' }}>
                This is a computer generated invoice and does not require a
                signature
              </div>
            </div>
          </div>
        </div>

        {/* Page footer text at the bottom of the invoice */}
        <div
          className="invoice-page-footer"
          style={{
            position: 'absolute',
            bottom: '8mm',
            left: '8mm',
            right: '8mm',
            width: 'calc(100% - 16mm)',
            padding: '2px 0',
            fontSize: '8px',
            color: '#666',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#000', fontSize: '9px' }}>
            * Subject to Hyderabad Jurisdiction Only Generated from: {website}
          </div>
          {!hidePageNumbers && (
            <div style={{ fontSize: '9px', textAlign: 'right' }}>
              Page{' '}
              <span className="page-number-screen">{isClient ? currentPage : 1}</span>
              <span className="page-number-print" />
              {' of '}
              <span className="total-pages-screen">{isClient ? totalPages : 1}</span>
              <span className="total-pages-print" />
            </div>
          )}
        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 2mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .invoice-template,
          .invoice-template * {
            visibility: visible;
          }
          
          .invoice-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          
          .invoice-page {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 8mm !important;
            border: 2.5px solid #000 !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          .line-items-table {
            page-break-inside: avoid !important;
          }
          
          /* Hide screen-based page numbers in print */
          .invoice-page-footer .page-number-screen,
          .invoice-page-footer .total-pages-screen {
            display: none !important;
          }
          
          /* Show print-based page numbers using CSS counters */
          .invoice-page-footer .page-number-print {
            display: inline !important;
          }
          
          .invoice-page-footer .page-number-print::before {
            content: counter(page);
          }
          
          .invoice-page-footer .total-pages-print {
            display: inline !important;
          }
          
          .invoice-page-footer .total-pages-print::before {
            content: counter(pages);
          }
        }
        
        @media screen {
          .invoice-template {
            background: #f5f5f5;
          }
          
          /* Hide print-based page numbers on screen */
          .invoice-page-footer .page-number-print,
          .invoice-page-footer .total-pages-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
