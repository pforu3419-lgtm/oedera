import nodemailer from "nodemailer";
import { ENV } from "./env";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export async function getEmailTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: parseInt(ENV.smtpPort || "587"),
      secure: ENV.smtpPort === "465",
      auth: {
        user: ENV.smtpUser,
        pass: ENV.smtpPassword,
      },
    });
  }
  return transporter;
}

export async function sendDailySalesReport(
  recipientEmail: string,
  data: {
    date: string;
    totalSales: number;
    totalTransactions: number;
    averageTransaction: number;
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  }
) {
  const transporter = await getEmailTransporter();

  const htmlContent = `
    <h2>Daily Sales Report - ${data.date}</h2>
    <p>Here is your daily sales summary:</p>
    <table style="border-collapse: collapse; width: 100%;">
      <tr style="background-color: #f2f2f2;">
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Sales</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">฿${data.totalSales.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Transactions</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">${data.totalTransactions}</td>
      </tr>
      <tr style="background-color: #f2f2f2;">
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>Average Transaction</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px;">฿${data.averageTransaction.toFixed(2)}</td>
      </tr>
    </table>

    <h3>Top Selling Products</h3>
    <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Revenue</th>
      </tr>
      ${data.topProducts
        .map(
          (product) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.quantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">฿${product.revenue.toFixed(2)}</td>
        </tr>
      `
        )
        .join("")}
    </table>
  `;

  return transporter.sendMail({
    from: ENV.smtpFromEmail,
    to: recipientEmail,
    subject: `Daily Sales Report - ${data.date}`,
    html: htmlContent,
  });
}

export async function sendLowStockAlert(
  recipientEmail: string,
  data: {
    products: Array<{
      name: string;
      currentStock: number;
      minimumThreshold: number;
    }>;
  }
) {
  const transporter = await getEmailTransporter();

  const htmlContent = `
    <h2>Low Stock Alert</h2>
    <p>The following products are running low on stock:</p>
    <table style="border-collapse: collapse; width: 100%;">
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Current Stock</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Minimum Threshold</th>
      </tr>
      ${data.products
        .map(
          (product) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.currentStock}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${product.minimumThreshold}</td>
        </tr>
      `
        )
        .join("")}
    </table>
    <p style="margin-top: 20px; color: #666;">Please reorder these products as soon as possible.</p>
  `;

  return transporter.sendMail({
    from: ENV.smtpFromEmail,
    to: recipientEmail,
    subject: "Low Stock Alert",
    html: htmlContent,
  });
}

export async function testEmailConnection() {
  try {
    const transporter = await getEmailTransporter();
    await transporter.verify();
    return { success: true, message: "Email connection verified" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
