// Checks the exact request MailService sends to Resend (fetch is stubbed —
// nothing leaves the machine). No database needed.
import type { ConfigService } from '@nestjs/config';
import { MailService } from '../src/mail/mail.service';

function mailServiceWith(env: Record<string, string | undefined>) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new MailService(config as never);
}

describe('MailService (Resend)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('posts a well-formed email to the Resend API', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    global.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{"id":"abc"}', { status: 200 });
    }) as typeof fetch;

    const mail = mailServiceWith({
      RESEND_API_KEY: 're_test_key',
      MAIL_FROM: 'Platform <no-reply@example.com>',
    });
    await mail.sendAdminInvite(
      'a@example.com',
      '<b>Evil</b> Name',
      'https://app.example.com/set-password#token=abc',
      72,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toMatchObject({
      from: 'Platform <no-reply@example.com>',
      to: ['a@example.com'],
      subject: 'Your admin account is ready',
    });
    expect(body.html).toContain('https://app.example.com/set-password#token=abc');
    expect(body.html).toContain('&lt;b&gt;Evil&lt;/b&gt;'); // name is escaped
    expect(body.html).not.toContain('<b>Evil</b>');
    expect(body.text).toContain('https://app.example.com/set-password#token=abc');
  });

  it('throws on a Resend error so callers can report it', async () => {
    global.fetch = (async () =>
      new Response('{"message":"domain not verified"}', { status: 403 })) as typeof fetch;
    const mail = mailServiceWith({ RESEND_API_KEY: 're_test_key', MAIL_FROM: 'x <x@x.com>' });
    await expect(
      mail.sendPasswordReset('a@example.com', 'https://x/reset-password#token=t', 30),
    ).rejects.toThrow(/403.*domain not verified/);
  });

  it('sends nothing without an API key (dev fallback)', async () => {
    let called = false;
    global.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch;
    const mail = mailServiceWith({});
    await mail.sendPasswordReset('a@example.com', 'https://x/reset-password#token=t', 30);
    expect(called).toBe(false);
  });
});
