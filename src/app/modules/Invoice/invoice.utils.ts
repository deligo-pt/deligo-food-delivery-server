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
    <title>Fatura de Entrega</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #1f2937;
        margin: 0;
        padding: 0;
        font-size: 11px;
        line-height: 1.5;
        background: #ffffff;
      }
      .page {
        padding: 0 50px 130px 50px;
      }

      /* HEADER BAND */
      .header-band {
        width: 100%;
        background: linear-gradient(135deg, #dc3173, #a80e52);
        margin-bottom: 30px;
        border-collapse: collapse;
      }
      .header-band td {
        vertical-align: middle;
        padding: 32px 20px;
      }
      .header-band td:first-child {
        padding-left: 50px;
      }
      .header-band td:last-child {
        padding-right: 50px;
      }
      .brand-logo {
        width: 78px;
        height: auto;
        display: block;
      }
      .brand-tagline {
        color: #fbdce9;
        font-size: 9px;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-top: 4px;
      }
      .doc-title {
        color: #ffffff;
        font-size: 20px;
        font-weight: bold;
        letter-spacing: 0.5px;
        text-align: right;
      }
      .doc-subtitle {
        color: #fbdce9;
        font-size: 10px;
        text-align: right;
        margin-top: 4px;
        letter-spacing: 0.5px;
      }

      /* META STRIP */
      .meta-strip {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 28px;
        border: 1px solid #f0d3de;
        border-radius: 10px;
        overflow: hidden;
      }
      .meta-strip td {
        padding: 12px 18px;
        background: #fdf1f6;
        border-right: 1px solid #f0d3de;
        vertical-align: top;
      }
      .meta-strip td:last-child {
        border-right: none;
      }
      .meta-label {
        color: #a80e52;
        font-size: 8.5px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .meta-value {
        color: #111827;
        font-size: 12px;
        font-weight: bold;
      }

      /* ENTITY CARDS */
      .entity-grid {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-bottom: 28px;
      }
      .entity-grid td {
        width: 50%;
        vertical-align: top;
      }
      .entity-grid td.recipient-cell {
        padding-right: 7px;
      }
      .entity-grid td.provider-cell {
        padding-left: 7px;
      }
      .entity-card {
        height: 100%;
        padding: 16px 18px;
        border: 1px solid #e5e7eb;
        border-top: 3px solid #dc3173;
        border-radius: 8px;
        background: #fafafa;
      }
      .entity-card.provider {
        border-top: 3px solid #9ca3af;
      }
      .block-title {
        font-size: 9.5px;
        font-weight: bold;
        color: #a80e52;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 8px;
      }
      .entity-card.provider .block-title {
        color: #6b7280;
      }
      .meta-text {
        color: #4b5563;
        margin-bottom: 3px;
      }
      .bold-value {
        color: #111827;
        font-weight: bold;
      }
      .entity-name {
        color: #111827;
        font-weight: bold;
        font-size: 13px;
        margin-bottom: 6px;
      }

      /* FINANCIAL TABLE */
      .section-heading {
        font-size: 11px;
        font-weight: bold;
        color: #111827;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
      }
      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-bottom: 25px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }
      .invoice-table th {
        background: #fdf1f6;
        border-bottom: 2px solid #dc3173;
        color: #a80e52;
        font-weight: bold;
        padding: 10px 12px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .invoice-table td {
        padding: 12px;
        border-bottom: 1px solid #f0f0f0;
        color: #374151;
      }
      .invoice-table tbody tr:last-child td {
        border-bottom: none;
      }
      .invoice-table tbody tr:nth-child(even) {
        background: #fcfcfd;
      }

      /* Explicit Column Alignment Utilities */
      .align-left { text-align: left; }
      .align-right { text-align: right; }
      .align-center { text-align: center; }

      /* SUMMARY CARD */
      .summary-wrapper {
        width: 100%;
        margin-top: 5px;
        margin-bottom: 30px;
      }
      .summary-card {
        width: 48%;
        margin-left: auto;
        background: #fdf1f6;
        border: 1px solid #f0d3de;
        border-radius: 8px;
        padding: 14px 18px;
      }
      .summary-table {
        width: 100%;
        border-collapse: collapse;
      }
      .summary-table td {
        padding: 5px 0;
        border-bottom: none;
        color: #4b5563;
        font-size: 11px;
      }
      .summary-table .total-bold td {
        font-weight: bold;
        color: #111827;
        font-size: 12px;
      }
      .summary-divider td {
        border-bottom: 1px solid #f0d3de;
        padding-bottom: 10px;
      }
      .grand-total-row td {
        font-weight: bold;
        color: #ffffff !important;
        font-size: 13px !important;
      }
      .grand-total-box {
        background: linear-gradient(135deg, #dc3173, #a80e52);
        border-radius: 6px;
      }
      .grand-total-box td {
        padding: 10px 12px !important;
      }

      /* THANK YOU NOTE */
      .thank-you {
        text-align: center;
        color: #a80e52;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 6px;
        padding-top: 50px;
      }
      .thank-you-sub {
        text-align: center;
        color: #6b7280;
        font-size: 9.5px;
        margin-bottom: 30px;
      }

      /* LEGAL FOOTER */
      .footer {
        position: fixed;
        bottom: 24px;
        left: 50px;
        right: 50px;
        border-top: 1px dashed #e5e7eb;
        padding-top: 14px;
        text-align: center;
        background: #ffffff;
      }
      .footer-company {
        color: #111827;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 6px;
      }
      .footer-details {
        color: #6b7280;
        font-size: 9px;
        line-height: 1.6;
        margin-bottom: 8px;
      }
      .footer-legal {
        color: #9ca3af;
        font-size: 8.5px;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>

    <!-- HEADER -->
    <table class="header-band" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="left" style="width: 50%;">
          <img class="brand-logo" src="https://res.cloudinary.com/duagqnvpw/image/upload/v1763599290/DeliGo-White_cfd6my.png" alt="DeliGo" />
          <div class="brand-tagline">Comida boa, entrega rápida</div>
        </td>
        <td align="right" style="width: 50%;">
          <div class="doc-title">Fatura de Entrega</div>
          <div class="doc-subtitle">Documento n.º {{invoiceNo}}</div>
        </td>
      </tr>
    </table>

    <div class="page">

      <!-- METADATA STRIP -->
      <table class="meta-strip" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div class="meta-label">Nº do Pedido</div>
            <div class="meta-value">{{orderId}}</div>
          </td>
          <td>
            <div class="meta-label">Data do Pedido</div>
            <div class="meta-value">{{dateStr}}</div>
          </td>
          <td>
            <div class="meta-label">Data do Documento</div>
            <div class="meta-value">{{dateStr}}</div>
          </td>
          {{#if atcud}}
          <td>
            <div class="meta-label">ATCUD</div>
            <div class="meta-value">{{atcud}}</div>
          </td>
          {{/if}}
        </tr>
      </table>

      <!-- ENTITY BLOCK (RECIPIENT & COURIER[ADMIN]) -->
      <table class="entity-grid" cellspacing="0" cellpadding="0">
        <tr>
          <!-- Left Column: Recipient (Customer) -->
          <td class="recipient-cell">
            <div class="entity-card recipient">
              <div class="block-title">Destinatário</div>
              <div class="entity-name">{{customerName}}</div>
              <div class="meta-text">{{addressLine1}}</div>
              <div class="meta-text">{{addressLine2}}</div>
              <div class="meta-text" style="margin-top: 8px;">NIF: <span class="bold-value">{{cleanNif}}</span></div>
            </div>
          </td>

          <!-- Right Column: Courier (Fleet Manager Corporate Identity) -->
          <td class="provider-cell">
            <div class="entity-card provider">
              <div class="block-title">Transportadora</div>
              <div class="entity-name">{{providerName}}</div>
              <div class="meta-text">{{providerAddress}}</div>
              <div class="meta-text" style="margin-top: 8px;">Código de registo: <span class="bold-value">{{providerRegCode}}</span></div>
              <div class="meta-text">NIF: <span class="bold-value">{{providerVat}}</span></div>
            </div>
          </td>
        </tr>
      </table>

      <!-- FINANCIAL BREAKDOWN TABLE -->
      <div class="section-heading">Resumo de Encargos</div>
      <table class="invoice-table" cellspacing="0" cellpadding="0">
        <thead>
          <tr>
            <th class="align-left" style="width: 40%;">Descrição</th>
            <th class="align-right" style="width: 15%;">Valor (EUR)</th>
            <th class="align-center" style="width: 15%;">IVA (%)</th>
            <th class="align-right" style="width: 15%;">IVA (EUR)</th>
            <th class="align-right" style="width: 15%;">Total (EUR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="align-left">Taxa de entrega</td>
            <td class="align-right">€{{delivery.net}}</td>
            <td class="align-center">23%</td>
            <td class="align-right">€{{delivery.vatAmount}}</td>
            <td class="align-right">€{{delivery.gross}}</td>
          </tr>
          <tr>
            <td class="align-left">Taxa de serviço</td>
            <td class="align-right">€{{service.net}}</td>
            <td class="align-center">23%</td>
            <td class="align-right">€{{service.vatAmount}}</td>
            <td class="align-right">€{{service.gross}}</td>
          </tr>
        </tbody>
      </table>

      <!-- SUMMARY SECTION -->
      <div class="summary-wrapper">
        <div class="summary-card">
          <table class="summary-table" cellspacing="0" cellpadding="0">
            <tr class="total-bold">
              <td>Valor (EUR)</td>
              <td class="align-right">€{{totalNet}}</td>
            </tr>
            <tr class="summary-divider">
              <td>IVA (23%)</td>
              <td class="align-right">€{{totalVat}}</td>
            </tr>
            {{#if hasDiscount}}
            <tr style="color: #ef4444;">
              <td>Campanha (EUR)</td>
              <td class="align-right">-€{{discountAmount}}</td>
            </tr>
            {{/if}}
          </table>
          <table class="summary-table grand-total-box" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
            <tr class="grand-total-row">
              <td>Cobrado ao cliente</td>
              <td class="align-right">€{{grandTotal}}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- THANK YOU NOTE -->
      <div class="thank-you">Obrigado por escolher a DeliGo!</div>
      <div class="thank-you-sub">A sua satisfação é a nossa prioridade.</div>

      <!-- LEGAL FOOTER -->
      <div class="footer">
        <div class="footer-company">DeliGo &middot; Operado por Pixel Miracle Lda</div>
        <div class="footer-details">
          Rua Joaquim Agostinho 16C, 1750-126 Lisbon, Portugal &nbsp;|&nbsp; NIF: 518758176<br>
          contact@deligo.pt &nbsp;|&nbsp; deligo.pt &nbsp;|&nbsp; +351 920 136 680
        </div>
        <div class="footer-legal">
          Operado sob atribuição oficial da plataforma para a DeliGo. Processado por computador.<br>
          Esta fatura simplificada refere-se exclusivamente aos encargos de intermediação e transporte de entrega.
        </div>
      </div>

    </div>

  </body>
  </html>
`;
