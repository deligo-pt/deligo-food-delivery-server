export const calculateVatBreakdown = (
  grossAmount: number,
  vatRateAsPercentage: number = 23,
) => {
  const divisor = 1 + vatRateAsPercentage / 100;
  const net = Number((grossAmount / divisor).toFixed(4));
  const vatAmount = Number((grossAmount - net).toFixed(4));

  return {
    net: Number(net.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    gross: Number(grossAmount.toFixed(2)),
  };
};

export const INVOICE_PDF_TEMPLATE = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Invoice for Delivery</title>
    <style>
      body { 
        font-family: Arial, sans-serif; 
        color: #1f2937; 
        margin: 0; 
        padding: 40px; 
        font-size: 11px; 
        line-height: 1.5; 
      }
      .title-center {
        text-align: center;
        font-size: 18px;
        font-weight: bold;
        letter-spacing: 0.5px;
        color: #111827;
        margin-bottom: 30px;
      }
      .meta-grid {
        width: 100%;
        margin-bottom: 35px;
        border-collapse: collapse;
      }
      .meta-grid td {
        vertical-align: top;
        padding: 0;
      }
      .meta-left {
        width: 50%;
        text-align: left;
      }
      .meta-right {
        width: 50%;
        text-align: right;
      }
      .block-title {
        font-size: 12px;
        font-weight: bold;
        color: #111827;
        margin-bottom: 6px;
      }
      .meta-text {
        color: #4b5563;
        margin-bottom: 3px;
      }
      .bold-value {
        color: #111827;
        font-weight: bold;
      }
      
      /* Premium Table Design matching DeliGo Pink */
      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        margin-bottom: 25px;
      }
      .invoice-table th {
        border-bottom: 2px solid #dc3173;
        color: #a80e52;
        font-weight: bold;
        padding: 10px 8px;
        font-size: 11px;
        text-transform: uppercase;
      }
      .invoice-table td {
        padding: 12px 8px;
        border-bottom: 1px solid #e5e7eb;
        color: #374151;
      }
      
      /* Explicit Column Alignment Utilities */
      .align-left {
        text-align: left;
      }
      .align-right {
        text-align: right;
      }
      .align-center {
        text-align: center;
      }
      
      /* Summary Right Aligned Block */
      .summary-wrapper {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        margin-top: 15px;
      }
      .summary-table {
        width: 45%;
        margin-left: auto;
        border-collapse: collapse;
      }
      .summary-table td {
        padding: 6px 8px;
        border-bottom: none;
        color: #374151;
        font-size: 11px;
      }
      .summary-table .total-bold td {
        font-weight: bold;
        color: #111827;
        font-size: 12px;
      }
      .grand-total-row td {
        font-weight: bold;
        color: #a80e52 !important;
        font-size: 13px !important;
        padding-top: 12px;
      }

      .footer { 
        position: fixed; 
        bottom: 30px; 
        left: 40px; 
        right: 40px; 
        text-align: center; 
        color: #9ca3af; 
        font-size: 9px; 
        border-top: 1px dashed #e5e7eb;
        padding-top: 15px;
      }
    </style>
  </head>
  <body>

    <div class="title-center">Invoice for Delivery</div>

    <!-- METADATA BLOCK -->
    <table class="meta-grid">
      <tr>
        <!-- Left Side: Order Core Meta -->
        <td class="meta-left">
          <div class="meta-text">Order ID <span class="bold-value">{{orderId}}</span></div>
          <div class="meta-text">Order created <span class="bold-value">{{dateStr}}</span></div>
        </td>
        <!-- Right Side: Document Tracking -->
        <td class="meta-right">
          <div class="meta-text">Document no. <span class="bold-value">{{invoiceNo}}</span></div>
          <div class="meta-text">Date <span class="bold-value">{{dateStr}}</span></div>
          {{#if atcud}}
          <div class="meta-text">ATCUD <span class="bold-value">{{atcud}}</span></div>
          {{/if}}
        </td>
      </tr>
    </table>

    <!-- ENTITY BLOCK (RECIPIENT & FLEET MANAGER COURIER) -->
    <table class="meta-grid">
      <tr>
        <!-- Left Column: Recipient (Customer) -->
        <td class="meta-left" style="padding-right: 20px;">
          <div class="block-title">Recipient</div>
          <div class="bold-value" style="margin-bottom: 4px;">{{customerName}}</div>
          <div class="meta-text">{{deliveryAddress}}</div>
          <div class="meta-text" style="margin-top: 8px;">VAT no.: {{cleanNif}}</div>
        </td>
        
        <!-- Right Column: Courier (Fleet Manager Corporate Identity) -->
        <td class="meta-right" style="padding-left: 20px;">
          <div class="block-title">Courier</div>
          <div class="bold-value" style="margin-bottom: 4px;">{{providerName}}</div>
          <div class="meta-text">{{providerAddress}}</div>
          <div class="meta-text" style="margin-top: 8px;">Reg. code: {{providerRegCode}}</div>
          <div class="meta-text">VAT no.: {{providerVat}}</div>
        </td>
      </tr>
    </table>

    <!-- FINANCIAL BREAKDOWN TABLE -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th class="align-left" style="width: 40%;">Title</th>
          <th class="align-right" style="width: 15%;">Sum (EUR)</th>
          <th class="align-center" style="width: 15%;">VAT (%)</th>
          <th class="align-right" style="width: 15%;">VAT (EUR)</th>
          <th class="align-right" style="width: 15%;">Total (EUR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="align-left">Delivery fee</td>
          <td class="align-right">€{{delivery.net}}</td>
          <td class="align-center">23%</td>
          <td class="align-right">€{{delivery.vatAmount}}</td>
          <td class="align-right">€{{delivery.gross}}</td>
        </tr>
        <tr>
          <td class="align-left">Service fee</td>
          <td class="align-right">€{{service.net}}</td>
          <td class="align-center">23%</td>
          <td class="align-right">€{{service.vatAmount}}</td>
          <td class="align-right">€{{service.gross}}</td>
        </tr>
      </tbody>
    </table>

    <!-- SUMMARY SECTION -->
    <div class="summary-wrapper">
      <table class="summary-table">
        <tr class="total-bold">
          <td>Total (EUR)</td>
          <td class="text-right">€{{totalNet}}</td>
        </tr>
        <tr>
          <td>VAT (23%)</td>
          <td class="text-right">€{{totalVat}}</td>
        </tr>
        <tr class="total-bold" style="border-bottom: 1px solid #e5e7eb;">
          <td>Total VAT (EUR)</td>
          <td class="text-right">€{{totalVat}}</td>
        </tr>
        <tr class="total-bold">
          <td>Total including VAT (EUR)</td>
          <td class="text-right">€{{grandTotal}}</td>
        </tr>
        {{#if hasDiscount}}
        <tr style="color: #ef4444;">
          <td>Campaign (EUR)</td>
          <td class="text-right">-€{{discountAmount}}</td>
        </tr>
        {{/if}}
        <tr class="grand-total-row">
          <td>Charged to client (EUR)</td>
          <td class="text-right">€{{grandTotal}}</td>
        </tr>
      </table>
    </div>

    <!-- LEGAL FOOTER -->
    <div class="footer">
      Operated under official platform assignment for DeliGo. Processado por computador.<br>
      Esta fatura simplificada refere-se exclusivamente aos encargos de intermediação e transporte de entrega.
    </div>

  </body>
  </html>
`;
