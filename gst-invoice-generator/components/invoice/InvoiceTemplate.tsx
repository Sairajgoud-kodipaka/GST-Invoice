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
  const MIN_ROWS = 7;
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
        fontSize: '11px',
        lineHeight: 1.4,
      }}
    >
      {/* A4 page with margins similar to PDF */}
      <div
        className="mx-auto"
        style={{
          maxWidth: '210mm',
          minHeight: '297mm',
          padding: '15mm 12mm 15mm 12mm',
        }}
      >
        {/* ======== TOP HEADER (exact like PDF) ======== */}
        {/* Row 1: Tax Invoice (left) | ORIGINAL + PAN (right) */}
        <div
          className="flex justify-between items-start mb-1"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                margin: 0,
                marginBottom: '2px',
              }}
            >
              Tax Invoice
            </h1>
            <div style={{ fontSize: '10px' }}>
              <p style={{ margin: 0 }}>
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
                fontSize: '10px',
              }}
            >
              ORIGINAL
            </p>
            {business.pan && (
              <p style={{ margin: 0, fontSize: '10px' }}>
                <span style={{ fontWeight: 600 }}>PAN NO :</span> {business.pan}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Logo centered */}
        <div
          className="flex justify-center mt-1 mb-1"
          style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}
        >
          <img
            src="/logo-Photoroom.png"
            alt="Pearls by Mangatrai Logo"
            style={{ maxWidth: '150px', height: 'auto' }}
          />
        </div>

        {/* Row 3: Brand name + legal name (centered) */}
        <div style={{ textAlign: 'center', marginBottom: '2px' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '2px',
            }}
          >
            {business.name}
          </div>
          <div style={{ fontSize: '11px' }}>{business.legalName}</div>
        </div>

        {/* Row 4: Address (center) */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '10px',
            marginBottom: '2px',
          }}
        >
          {business.address}, {business.city} - {business.pincode},{' '}
          {business.state}, India
        </div>

        {/* Row 5: Email | Website | Phone (center in a row) */}
        <div
          className="flex justify-center gap-6 mb-3"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '18px',
            fontSize: '10px',
            marginBottom: '10px',
          }}
        >
          <span>{business.email}</span>
          <span>{website}</span>
          <span>{business.phone}</span>
        </div>

        {/* Divider line (thicker like PDF) */}
        <div
          style={{
            borderTop: '2px solid #000',
            marginBottom: '6px',
          }}
        />

        {/* ======== INVOICE META TABLE (3x3 grid like PDF) ======== */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '10px',
            marginBottom: '6px',
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
            fontSize: '10px',
            marginBottom: '8px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  fontWeight: 600,
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
                  padding: '4px',
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
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '10px',
            marginBottom: '6px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #000', padding: '4px' }}>#</th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'left',
                }}
              >
                ITEM - SKU
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  width: '40px',
                }}
              >
                QTY
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                }}
              >
                RATE PER ITEM (₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                }}
              >
                DISCOUNT (ITEM ₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                }}
              >
                TAXABLE (ITEM ₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  width: '60px',
                }}
              >
                HSN
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  width: '55px',
                }}
              >
                GST (%)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'right',
                }}
              >
                IGST (₹)
              </th>
              <th
                style={{
                  border: '1px solid #000',
                  padding: '4px',
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
                      padding: '8px 4px',
                      height: '18px',
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
                  padding: '4px',
                  fontWeight: 600,
                }}
              >
                TOTAL
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  textAlign: 'center',
                  fontWeight: 600,
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
            gap: '16px',
            marginBottom: '6px',
          }}
        >
          {/* LEFT: Payment mode + T&C + Amount in words (single box like PDF) */}
          <div>
            {/* Payment mode line */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '10px',
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
                fontSize: '10px',
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      borderLeft: '1px solid #000',
                      borderRight: '1px solid #000',
                      padding: '4px 4px 2px',
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
                      padding: '0 4px 4px',
                      fontSize: '9px',
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
                      fontSize: '10px',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                      Total Invoice Amount in Words
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '11px' }}>
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
                fontSize: '10px',
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

        {/* ======== FOOTER: E&O, PAID stamp, QR, signature (layout like PDF) ======== */}
        <div
          style={{
            marginTop: '10px',
            borderTop: '1px solid #999',
            paddingTop: '8px',
            fontSize: '9px',
          }}
        >
          <div style={{ marginBottom: '6px', fontWeight: 600 }}>E & O.E</div>

          <div
            className="flex justify-between items-start"
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            {/* Conditional stamp (left) */}
            {stampType && (
              <div
                style={{
                  position: 'relative',
                  width: '150px',
                  height: '80px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-20deg)',
                    width: '120px',
                    height: '50px',
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
                      fontSize: '22px',
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

            {/* QR + signature (right) */}
            <div
              className="flex gap-10"
              style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-end',
              }}
            >
             
              {/* Signature text */}
              <div style={{ textAlign: 'right', fontSize: '9px' }}>
                <div style={{ fontWeight: 600, marginBottom: '18px' }}>
                  For, {business.legalName}
                </div>
                <div style={{ color: '#666' }}>
                  This is a computer generated invoice and does not require a
                  signature
                </div>
                <div style={{ color: '#666', marginTop: '2px' }}>
                  * Subject to Hyderabad jurisdiction only
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          .invoice-template {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .invoice-template:last-child {
            page-break-after: auto;
          }
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
