import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;

interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Sends through Resend's HTTP API with plain fetch (no SDK dependency).
// Without RESEND_API_KEY (allowed outside production only — see
// config/env.ts) nothing is sent and the email is logged instead, so the
// reset/invite flows are usable in local dev.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey?: string;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from =
      config.get('MAIL_FROM', { infer: true }) ?? 'Dev <no-reply@localhost>';
  }

  sendPasswordReset(to: string, link: string, validMinutes: number) {
    return this.send({
      to,
      subject: 'Reset your password',
      text: [
        'We received a request to reset your password.',
        `Open this link within ${validMinutes} minutes to choose a new one:`,
        link,
        '',
        "If you didn't request this, ignore this email — your password stays the same.",
      ].join('\n'),
      html: layout(`
        <p>We received a request to reset your password.</p>
        <p>This link works once and expires in ${validMinutes} minutes:</p>
        ${button(link, 'Reset password')}
        <p style="color:#666">If you didn't request this, ignore this email — your password stays the same.</p>
      `),
    });
  }

  sendAdminInvite(to: string, name: string, link: string, validHours: number) {
    return this.send({
      to,
      subject: 'Your admin account is ready',
      text: [
        `Hi ${name},`,
        'An admin account has been created for you.',
        `Set your password within ${validHours} hours using this link:`,
        link,
      ].join('\n'),
      html: layout(`
        <p>Hi ${escapeHtml(name)},</p>
        <p>An admin account has been created for you.</p>
        <p>This link works once and expires in ${validHours} hours:</p>
        ${button(link, 'Set your password')}
      `),
    });
  }

  private async send(email: OutgoingEmail): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(
        `RESEND_API_KEY not set — email NOT sent (dev only).\n` +
          `To: ${email.to}\nSubject: ${email.subject}\n${email.text}`,
      );
      return;
    }

    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Resend's error body never contains our API key; safe to log.
      const detail = await response.text().catch(() => '');
      throw new Error(`Resend responded ${response.status}: ${detail}`);
    }
  }
}

function layout(body: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:520px;margin:0 auto;padding:24px">${body}</body></html>`;
}

// The href is our own URL + a base64url token, so it can't contain quotes.
function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#1f4fd8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${label}</a></p><p style="color:#666;font-size:13px">Or paste this into your browser:<br>${escapeHtml(href)}</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
