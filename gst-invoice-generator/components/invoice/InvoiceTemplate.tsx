'use client';

import { InvoiceData } from '@/app/types/invoice';
import { formatCurrency } from '@/app/lib/invoice-formatter';

interface InvoiceTemplateProps {
  invoice: InvoiceData;
}

export function InvoiceTemplate({ invoice }: InvoiceTemplateProps) {
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
        className="mx-auto invoice-page"
        style={{
          width: '210mm',
          maxWidth: '210mm',
          height: 'auto',
          minHeight: 'auto',
          maxHeight: '297mm',
          padding: '3mm 4mm 3mm 4mm',
          border: '2px solid #000',
          position: 'relative',
          boxSizing: 'border-box',
          margin: '0 auto',
          backgroundColor: 'white',
          overflow: 'hidden',
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
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
                marginBottom: '2px',
                lineHeight: '1.1',
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
            style={{ maxWidth: '110px', height: 'auto' }}
          />
        </div>

        {/* Row 3: Brand name + legal name (centered) */}
        <div style={{ textAlign: 'center', marginBottom: '2px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 'bold',
              marginBottom: '1px',
              lineHeight: '1.1',
            }}
          >
            {business.name}
          </div>
          <div style={{ fontSize: '9px', lineHeight: '1.2' }}>{business.legalName}</div>
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
            marginTop: '2px',
            marginBottom: '2px',
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
                  padding: '2px',
                  width: '33.33%',
                }}
              >
                <span style={{ fontWeight: 600 }}>Invoice No:</span>{' '}
                {metadata.invoiceNo}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '2px 3px',
                  width: '33.33%',
                }}
              >
                <span style={{ fontWeight: 600 }}>Order No:</span>{' '}
                {metadata.orderNo}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '2px 3px',
                  width: '33.33%',
                }}
              >
                <span style={{ fontWeight: 600 }}>Transport Mode:</span>{' '}
                {metadata.transportMode || 'DTDC Air 500gm'}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '2px' }}>
                <span style={{ fontWeight: 600 }}>Invoice Date:</span>{' '}
                {metadata.invoiceDate}
              </td>
              <td style={{ border: '1px solid #000', padding: '2px' }}>
                <span style={{ fontWeight: 600 }}>Order Date:</span>{' '}
                {metadata.orderDate}
              </td>
              <td style={{ border: '1px solid #000', padding: '2px' }}>
                <span style={{ fontWeight: 600 }}>Date of Supply:</span>
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '2px' }}>
                <span style={{ fontWeight: 600 }}>State:</span>{' '}
                {metadata.state}
              </td>
              <td style={{ border: '1px solid #000', padding: '2px' }}>
                <span style={{ fontWeight: 600 }}>Code:</span>{' '}
                {metadata.stateCode}
              </td>
              <td style={{ border: '1px solid #000', padding: '2px' }}>
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
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                BILL TO PARTY
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'center',
                  fontWeight: 600,
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
                  padding: '2px',
                  verticalAlign: 'top',
                }}
              >
                <div style={{ fontWeight: 600 }}>{billToParty.name}</div>
                <div>{billToParty.address}</div>
                {billToParty.city && <div>{billToParty.city}</div>}
                <div>Pin code - {billToParty.pincode}</div>
                {billToParty.phone && <div>Phone: {billToParty.phone}</div>}
                <div>GSTIN: {billToParty.gstin || '-'}</div>
                <div>
                  State: {billToParty.state} &nbsp; Code {billToParty.stateCode}{' '}
                  &nbsp; Country: {billToParty.country}
                </div>
              </td>

              {/* Ship To cell */}
              <td
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  verticalAlign: 'top',
                }}
              >
                <div style={{ fontWeight: 600 }}>{shipToParty.name}</div>
                <div>{shipToParty.address}</div>
                {shipToParty.city && <div>{shipToParty.city}</div>}
                <div>Pin code - {shipToParty.pincode}</div>
                {shipToParty.phone && <div>Phone: {shipToParty.phone}</div>}
                <div>GSTIN: {shipToParty.gstin || '-'}</div>
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
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #000', padding: '2px' }}>#</th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'left',
                }}
              >
                ITEM - SKU
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'center',
                  width: '35px',
                }}
              >
                QTY
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'right',
                }}
              >
                RATE PER ITEM (₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'right',
                }}
              >
                DISCOUNT (ITEM ₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'right',
                }}
              >
                TAXABLE (ITEM ₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'center',
                  width: '55px',
                }}
              >
                HSN
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'center',
                  width: '50px',
                }}
              >
                GST (%)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'right',
                }}
              >
                IGST (₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'right',
                }}
              >
                TOTAL (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.sno}>
                <td style={{ border: '1px solid #000', padding: '2px' }}>
                  {item.sno}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px' }}>
                  {item.itemName} - {item.sku}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '2px',
                    textAlign: 'center',
                  }}
                >
                  {item.quantity}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '2px',
                    textAlign: 'right',
                  }}
                >
                  {formatAmount(item.ratePerItem)}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '2px',
                    textAlign: 'right',
                  }}
                >
                  {formatAmount(item.discountPerItem)}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '2px',
                    textAlign: 'right',
                  }}
                >
                  {formatAmount(item.taxableAmount)}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '2px',
                    textAlign: 'center',
                  }}
                >
                  {item.hsn}
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '2px',
                    textAlign: 'center',
                  }}
                >
                  {item.gstRate}%
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    padding: '2px',
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
                    padding: '2px',
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
                      padding: '2px',
                      height: '10px',
                    }}
                  />
                ))}
              </tr>
            ))}

            {/* TOTAL ROW (like PDF) */}
            <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 600 }}>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  fontWeight: 600,
                }}
              >
                TOTAL
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {totalQuantity}
              </td>
              <td
                colSpan={6}
                style={{ border: '1px solid #000', padding: '2px' }}
              />
              <td
                style={{
                  border: '1px solid #000',
                  padding: '2px',
                  textAlign: 'right',
                  fontWeight: 600,
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
            gridTemplateColumns: '1.4fr 1fr',
            gap: '8px',
            marginBottom: '2px',
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
                      padding: '2px',
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
                      padding: '2px',
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
                      padding: '2px',
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
                      padding: '2px',
                      fontSize: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '1px' }}>
                      Total Invoice Amount in Words
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '9px' }}>
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
                      padding: '2px',
                    }}
                  >
                    Total amount before Tax(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '2px',
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
                      padding: '2px',
                    }}
                  >
                    Total Tax amount(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '2px',
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
                      padding: '2px',
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
                      padding: '2px',
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
                      padding: '2px',
                    }}
                  >
                    Shipping amount(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '2px',
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
                      padding: '2px',
                    }}
                  >
                    Total amount after Tax(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '2px',
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
                      padding: '2px',
                    }}
                  >
                    Round off
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '2px',
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
                      padding: '2px',
                      fontWeight: 700,
                    }}
                  >
                    TOTAL(₹)
                  </td>
                  <td
                    style={{
                      border: '1px solid #000',
                      padding: '2px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '10px',
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
            marginTop: '2px',
            borderTop: '1px solid #999',
            paddingTop: '2px',
            fontSize: '8px',
            paddingBottom: '2px',
          }}
        >
          <div style={{ marginBottom: '2px', fontWeight: 600 }}>E & O.E</div>

          {/* Fixed footer band with aligned items */}
          <div
            className="flex justify-between items-center"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: '45px',
            }}
          >
            {/* PAID stamp (left) */}
            {stampType && (
              <div
                style={{
                  position: 'relative',
                  width: '100px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-20deg)',
                    width: '85px',
                    height: '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `3px solid ${
                      stampType === 'paid'
                        ? '#2563eb'
                        : stampType === 'cancelled'
                        ? '#dc2626'
                        : stampType === 'pending'
                        ? '#f59e0b'
                        : '#6b7280'
                    }`,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    opacity: 0.8,
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
                      fontSize: '16px',
                      letterSpacing: '1px',
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

            {/* Empty center space */}
            <div style={{ flex: 1 }} />

            {/* Signature text (right) */}
            <div style={{ textAlign: 'right', fontSize: '8px' }}>
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

        {/* Page footer text inside the invoice border */}
        <div
          style={{
            width: '100%',
            padding: '2px 0 0 0',
            marginTop: '2px',
            fontSize: '8px',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#000' }}>* Subject to Hyderabad Jurisdiction Only</div>
          <div>Generated from {business.name} - Page 1 of 1</div>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: hidden !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }
          .invoice-template {
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }
          .invoice-page {
            width: 210mm !important;
            max-width: 210mm !important;
            height: auto !important;
            min-height: auto !important;
            max-height: 297mm !important;
            padding: 3mm 4mm !important;
            margin: 0 auto !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            overflow: hidden !important;
          }
          .invoice-template > div:first-child {
            margin-top: 3mm !important;
            margin-bottom: 0 !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          /* Prevent line items table from breaking - keep everything on one page */
          .line-items-table {
            page-break-inside: avoid !important;
          }
          .line-items-table thead {
            display: table-header-group;
          }
          .line-items-table tbody {
            display: table-row-group;
          }
          .line-items-table tr {
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          /* Keep table header on each page */
          .line-items-table thead tr {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Keep all tables together */
          table {
            page-break-inside: avoid !important;
          }
          /* Keep header sections together (Tax Invoice, logo, company info, etc.) */
          .invoice-template > div:first-child > div:first-child,
          .invoice-template > div:first-child > div:nth-child(2),
          .invoice-template > div:first-child > div:nth-child(3),
          .invoice-template > div:first-child > div:nth-child(4),
          .invoice-template > div:first-child > div:nth-child(5),
          .invoice-template > div:first-child > div:nth-child(6) {
            page-break-inside: avoid !important;
          }
          /* Keep totals and payment section together */
          .invoice-template > div:first-child > div:nth-last-child(2) {
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
          }
          .invoice-template > div:last-child {
            page-break-after: avoid !important;
            page-break-before: avoid !important;
          }
          /* Prevent blank pages - hide empty elements */
          .invoice-template > div:empty,
          body > div:empty,
          html > body > div:empty {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Prevent any element after invoice from creating pages */
          .invoice-template ~ * {
            display: none !important;
          }
          /* Ensure no orphaned content creates pages */
          * {
            page-break-after: auto !important;
          }
          .invoice-page,
          .invoice-template {
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
