import * as XLSX from 'xlsx';

export interface TaxInvoiceData {
  invoiceNo: string;
  invoiceType: "full" | "abbreviated";
  date: Date;
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  subtotal: number;
  vat: number;
  total: number;
  companyName?: string;
  companyTaxId?: string;
  companyAddress?: string;
}

export function exportTaxInvoiceToPDF(invoice: TaxInvoiceData) {
  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ใบกำกับภาษี ${invoice.invoiceNo}</title>
      <style>
        body {
          font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 20px;
          color: #333;
          font-size: 14px;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #333;
          padding: 30px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .header .invoice-type {
          margin-top: 10px;
          font-size: 16px;
          color: #666;
        }
        .company-info {
          margin-bottom: 30px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .info-section {
          flex: 1;
        }
        .info-section h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: bold;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        .info-section p {
          margin: 5px 0;
          line-height: 1.6;
        }
        .invoice-details {
          margin: 30px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dotted #ccc;
        }
        .detail-label {
          font-weight: bold;
        }
        .amounts {
          margin-top: 20px;
          text-align: right;
        }
        .amount-row {
          display: flex;
          justify-content: flex-end;
          padding: 8px 0;
          gap: 20px;
        }
        .amount-row.total {
          font-size: 18px;
          font-weight: bold;
          border-top: 2px solid #333;
          padding-top: 10px;
          margin-top: 10px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        @media print {
          body {
            margin: 0;
          }
          .invoice-container {
            border: none;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>ใบกำกับภาษี / TAX INVOICE</h1>
          <div class="invoice-type">${invoice.invoiceType === "full" ? "แบบเต็มรูป" : "แบบอย่างย่อ"}</div>
        </div>

        <div class="info-row">
          <div class="info-section">
            <h3>ผู้ขาย / SELLER</h3>
            <p><strong>${invoice.companyName || "บริษัท"}</strong></p>
            <p>เลขผู้เสียภาษี: ${invoice.companyTaxId || "-"}</p>
            <p>${invoice.companyAddress || ""}</p>
          </div>
          <div class="info-section">
            <h3>ผู้ซื้อ / BUYER</h3>
            <p><strong>${invoice.customerName}</strong></p>
            ${invoice.customerTaxId ? `<p>เลขผู้เสียภาษี: ${invoice.customerTaxId}</p>` : ""}
            ${invoice.customerAddress ? `<p>${invoice.customerAddress}</p>` : ""}
          </div>
        </div>

        <div class="invoice-details">
          <div class="detail-row">
            <span class="detail-label">เลขที่ใบกำกับภาษี:</span>
            <span>${invoice.invoiceNo}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">วันที่ออกใบกำกับภาษี:</span>
            <span>${new Date(invoice.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div class="amounts">
          <div class="amount-row">
            <span style="width: 150px; text-align: right;">ยอดก่อนภาษีมูลค่าเพิ่ม:</span>
            <span style="width: 120px; text-align: right;">฿${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div class="amount-row">
            <span style="width: 150px; text-align: right;">ภาษีมูลค่าเพิ่ม (7%):</span>
            <span style="width: 120px; text-align: right;">฿${invoice.vat.toFixed(2)}</span>
          </div>
          <div class="amount-row total">
            <span style="width: 150px; text-align: right;">ยอดรวมทั้งสิ้น:</span>
            <span style="width: 120px; text-align: right;">฿${invoice.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>ใบกำกับภาษีนี้สร้างขึ้นโดยระบบ Ordera</p>
          <p>${new Date().toLocaleString('th-TH')}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tax-invoice-${invoice.invoiceNo}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTaxInvoicesToExcel(invoices: TaxInvoiceData[]) {
  const workbook = XLSX.utils.book_new();

  // รายการใบกำกับภาษี
  const invoiceData = [
    ['เลขที่ใบกำกับภาษี', 'วันที่', 'ชื่อลูกค้า', 'เลขผู้เสียภาษี', 'ยอดก่อน VAT', 'VAT (7%)', 'ยอดรวม', 'ประเภท'],
    ...invoices.map((inv) => [
      inv.invoiceNo,
      new Date(inv.date).toLocaleDateString('th-TH'),
      inv.customerName,
      inv.customerTaxId || '-',
      inv.subtotal.toFixed(2),
      inv.vat.toFixed(2),
      inv.total.toFixed(2),
      inv.invoiceType === "full" ? "เต็มรูป" : "อย่างย่อ",
    ]),
  ];

  const invoiceSheet = XLSX.utils.aoa_to_sheet(invoiceData);
  XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'ใบกำกับภาษี');

  // สรุปยอดรวม
  const totalSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalVat = invoices.reduce((sum, inv) => sum + inv.vat, 0);
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);

  const summaryData = [
    ['สรุปรายงานใบกำกับภาษี'],
    [''],
    ['จำนวนใบกำกับภาษี', invoices.length],
    ['ยอดรวมก่อน VAT', totalSubtotal.toFixed(2)],
    ['VAT รวม (7%)', totalVat.toFixed(2)],
    ['ยอดรวมทั้งสิ้น', totalAmount.toFixed(2)],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุป');

  // ตั้งค่าความกว้างของคอลัมน์
  invoiceSheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
  ];

  const fileName = `tax-invoices-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
