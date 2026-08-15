import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderEmailPayload {
  reference: string; // e.g. ORD-42
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  total: number;
  items: OrderEmailItem[];
  trackingNumber?: string | null;
  carrier?: string | null;
}

/**
 * Transactional email sender. Uses the Resend HTTP API (no extra SMTP
 * dependency) when RESEND_API_KEY is configured; otherwise logs the message
 * so local/dev environments work without credentials. Sending is best-effort
 * and never throws - a mail failure must not break the order flow.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private money(n: number): string {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  private async deliver(to: string, subject: string, html: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM') || 'NovaShop <onboarding@resend.dev>';

    if (!to) {
      this.logger.warn(`Skipping email "${subject}" - no recipient address`);
      return;
    }

    if (!apiKey) {
      this.logger.log(
        `[email:dev] to=${to} subject="${subject}" (RESEND_API_KEY not set - email not sent)`,
      );
      return;
    }

    try {
      await axios.post(
        'https://api.resend.com/emails',
        { from, to, subject, html },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10_000 },
      );
      this.logger.log(`Email sent to ${to}: "${subject}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${to}: ${message}`);
    }
  }

  private itemsTable(items: OrderEmailItem[]): string {
    const rows = items
      .map(
        (i) =>
          `<tr><td>${i.name}</td><td align="center">${i.quantity}</td>` +
          `<td align="right">${this.money(i.price)}</td></tr>`,
      )
      .join('');
    return `<table width="100%" cellpadding="6" style="border-collapse:collapse">
      <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Price</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  private totalsBlock(p: OrderEmailPayload): string {
    return `<table width="100%" cellpadding="4" style="border-collapse:collapse;margin-top:12px">
      <tr><td align="right">Subtotal</td><td align="right">${this.money(p.subtotal)}</td></tr>
      <tr><td align="right">Shipping</td><td align="right">${this.money(p.shippingFee)}</td></tr>
      <tr><td align="right">Tax</td><td align="right">${this.money(p.taxAmount)}</td></tr>
      <tr><td align="right"><strong>Total</strong></td><td align="right"><strong>${this.money(p.total)}</strong></td></tr>
    </table>`;
  }

  async sendOrderConfirmation(to: string, order: OrderEmailPayload): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Thanks for your order 🎉</h2>
        <p>Your order <strong>${order.reference}</strong> has been received and is now being processed.</p>
        ${this.itemsTable(order.items)}
        ${this.totalsBlock(order)}
        <p style="color:#666;font-size:12px;margin-top:16px">NovaShop - this is an automated message.</p>
      </div>`;
    await this.deliver(to, `Order ${order.reference} confirmed`, html);
  }

  async sendOrderShipped(to: string, order: OrderEmailPayload): Promise<void> {
    const tracking =
      order.trackingNumber
        ? `<p>Carrier: <strong>${order.carrier || 'N/A'}</strong><br/>Tracking number: <strong>${order.trackingNumber}</strong></p>`
        : '';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Your order is on its way 🚚</h2>
        <p>Order <strong>${order.reference}</strong> has been shipped.</p>
        ${tracking}
        ${this.itemsTable(order.items)}
        <p style="color:#666;font-size:12px;margin-top:16px">NovaShop - this is an automated message.</p>
      </div>`;
    await this.deliver(to, `Order ${order.reference} shipped`, html);
  }
}
