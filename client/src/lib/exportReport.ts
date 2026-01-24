import * as XLSX from 'xlsx';

export interface ReportData {
  startDate: Date;
  endDate: Date;
  totalTransactions: number;
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  transactions: Array<{
    id: string;
    total: string;
    tax: string;
    discount: string;
    paymentMethod: string;
    createdAt: Date;
  }>;
}

export function exportToExcel(reportData: ReportData) {
  const workbook = XLSX.utils.book_new();

  // สรุปรายงาน
  const summaryData = [
    ['รายงานยอดขาย'],
    ['ช่วงเวลา', `${new Date(reportData.startDate).toLocaleDateString('th-TH')} - ${new Date(reportData.endDate).toLocaleDateString('th-TH')}`],
    [''],
    ['ยอดขายรวม', reportData.totalSales.toFixed(2)],
    ['ภาษีมูลค่าเพิ่ม', reportData.totalTax.toFixed(2)],
    ['ส่วนลดรวม', reportData.totalDiscount.toFixed(2)],
    ['จำนวนรายการ', reportData.totalTransactions],
    ['ค่าเฉลี่ยต่อรายการ', (reportData.totalSales / reportData.totalTransactions).toFixed(2)],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุป');

  // รายละเอียดรายการขาย
  const transactionData = [
    ['เลขที่รายการ', 'ยอดขาย', 'ภาษี', 'ส่วนลด', 'วิธีชำระเงิน', 'วันที่-เวลา'],
    ...reportData.transactions.map((t) => [
      t.id,
      parseFloat(t.total).toFixed(2),
      parseFloat(t.tax).toFixed(2),
      parseFloat(t.discount).toFixed(2),
      t.paymentMethod || '-',
      new Date(t.createdAt).toLocaleString('th-TH'),
    ]),
  ];

  const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
  XLSX.utils.book_append_sheet(workbook, transactionSheet, 'รายการขาย');

  // ตั้งค่าความกว้างของคอลัมน์
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
  transactionSheet['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
  ];

  // ส่งออกไฟล์
  const fileName = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportToPDF(reportData: ReportData) {
  // สร้าง HTML สำหรับ PDF
  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>รายงานยอดขาย</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 20px;
          color: #333;
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
          color: #1f2937;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-item {
          padding: 15px;
          background-color: #f3f4f6;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        .summary-item label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .summary-item .value {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #3b82f6;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        @media print {
          body {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>รายงานยอดขาย</h1>
        <p>ช่วงเวลา: ${new Date(reportData.startDate).toLocaleDateString('th-TH')} - ${new Date(reportData.endDate).toLocaleDateString('th-TH')}</p>
        <p>สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
      </div>

      <div class="summary">
        <div class="summary-item">
          <label>ยอดขายรวม</label>
          <div class="value">฿${reportData.totalSales.toFixed(2)}</div>
        </div>
        <div class="summary-item">
          <label>จำนวนรายการ</label>
          <div class="value">${reportData.totalTransactions}</div>
        </div>
        <div class="summary-item">
          <label>ภาษีมูลค่าเพิ่ม</label>
          <div class="value">฿${reportData.totalTax.toFixed(2)}</div>
        </div>
        <div class="summary-item">
          <label>ส่วนลดรวม</label>
          <div class="value">฿${reportData.totalDiscount.toFixed(2)}</div>
        </div>
      </div>

      <h2>รายละเอียดรายการขาย</h2>
      <table>
        <thead>
          <tr>
            <th>เลขที่รายการ</th>
            <th>ยอดขาย</th>
            <th>ภาษี</th>
            <th>ส่วนลด</th>
            <th>วิธีชำระเงิน</th>
            <th>วันที่-เวลา</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.transactions
            .map(
              (t) => `
            <tr>
              <td>${t.id}</td>
              <td>฿${parseFloat(t.total).toFixed(2)}</td>
              <td>฿${parseFloat(t.tax).toFixed(2)}</td>
              <td>฿${parseFloat(t.discount).toFixed(2)}</td>
              <td>${t.paymentMethod || '-'}</td>
              <td>${new Date(t.createdAt).toLocaleString('th-TH')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>รายงานนี้สร้างขึ้นโดย Ordera</p>
      </div>
    </body>
    </html>
  `;

  // สร้าง Blob และ download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sales-report-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
