// End-to-end auth tests against a real Postgres database.
//
// Needs TEST_DATABASE_URL pointing at a DISPOSABLE database with the
// current schema pushed (every table touched here is wiped between tests):
//   $env:DATABASE_URL = $env:TEST_DATABASE_URL; pnpm --filter @investment-platform/db exec prisma db push
//   pnpm --filter api test:e2e -- auth
// Skipped when TEST_DATABASE_URL is unset.
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import { createHmac, randomBytes } from 'node:crypto';
import request from 'supertest';
import { Role } from '@investment-platform/db';
import { validateEnv } from '../src/config/env';
import { configureApp } from '../src/app.setup';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/auth/auth.module';
import { InvestorModule } from '../src/investor/investor.module';
import { MailModule } from '../src/mail/mail.module';
import { MailService } from '../src/mail/mail.service';
import { AdminAccountModule } from '../src/admin/admin-account/admin-account.module';

// Records outgoing email instead of calling Resend.
interface SentMail {
  kind: 'reset' | 'invite';
  to: string;
  link: string;
}
const sentMail: SentMail[] = [];
let mailShouldFail = false;
const fakeMail = {
  async sendPasswordReset(to: string, link: string) {
    if (mailShouldFail) throw new Error('resend down');
    sentMail.push({ kind: 'reset', to, link });
  },
  async sendAdminInvite(to: string, _name: string, link: string) {
    if (mailShouldFail) throw new Error('resend down');
    sentMail.push({ kind: 'invite', to, link });
  },
};

const tokenFrom = (link: string) => new URL(link).hash.replace('#token=', '');

// forgotPassword sends without awaiting; give the promise a tick to land.
const flush = () => new Promise((resolve) => setImmediate(resolve));

const TEST_DB = process.env.TEST_DATABASE_URL;
const describeIfDb = TEST_DB ? describe : describe.skip;

const ORIGIN = 'http://localhost:3001';
const PASSWORD = 'Correct-Horse-9';
const SECRET = randomBytes(48).toString('base64');

describeIfDb('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.JWT_ACCESS_SECRET = SECRET;
    process.env.CORS_ORIGINS = ORIGIN;
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnv,
        }),
        PrismaModule,
        MailModule,
        AuthModule,
        InvestorModule,
        AdminAccountModule,
      ],
    })
      .overrideProvider(MailService)
      .useValue(fakeMail)
      // Per-IP rate limits would trip on the dozens of logins below; the
      // per-account lockout is still exercised.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    sentMail.length = 0;
    mailShouldFail = false;
    await prisma.$transaction([
      prisma.passwordToken.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.loginAttempt.deleteMany(),
      prisma.blacklistedToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.investor.deleteMany(),
      prisma.adminProfile.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  // --- helpers -----------------------------------------------------------

  async function createUser(opts: {
    email: string;
    phone?: string;
    role?: Role;
    allowedIpRange?: string;
    withInvestor?: boolean;
  }) {
    const role = opts.role ?? Role.INVESTOR;
    return prisma.user.create({
      data: {
        email: opts.email,
        phone: opts.phone,
        role,
        passwordHash: await bcrypt.hash(PASSWORD, 4),
        adminProfile:
          role === Role.INVESTOR
            ? undefined
            : { create: { name: 'Admin', allowedIpRange: opts.allowedIpRange } },
        investorProfile: opts.withInvestor
          ? { create: { fullname: 'Test Investor' } }
          : undefined,
      },
      include: { investorProfile: true },
    });
  }

  const http = () => request(app.getHttpServer());

  function login(identifier: string, password = PASSWORD) {
    return http()
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ identifier, password });
  }

  function cookiesOf(res: request.Response): string[] {
    const raw = res.headers['set-cookie'] as unknown;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }

  function cookie(res: request.Response, name: string): string | undefined {
    const match = cookiesOf(res).find((c) => c.startsWith(`${name}=`));
    const value = match?.split(';')[0].slice(name.length + 1);
    return value ? value : undefined;
  }

  function access(token: string) {
    return `access_token=${token}`;
  }

  function refresh(token: string) {
    return `refresh_token=${token}`;
  }

  async function loginTokens(identifier: string) {
    const res = await login(identifier).expect(200);
    return {
      access: cookie(res, 'access_token')!,
      refresh: cookie(res, 'refresh_token')!,
    };
  }

  // --- login -------------------------------------------------------------

  it('logs in and sets hardened cookies without leaking tokens in the body', async () => {
    await createUser({ email: 'inv@example.com' });
    const res = await login('INV@example.com').expect(200);

    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/); // no JWT in body
    expect(res.body.user).toMatchObject({ email: 'inv@example.com', role: 'INVESTOR' });
    expect(res.body.user.passwordHash).toBeUndefined();

    const accessCookie = cookiesOf(res).find((c) => c.startsWith('access_token='))!;
    const refreshCookie = cookiesOf(res).find((c) => c.startsWith('refresh_token='))!;
    expect(accessCookie).toMatch(/HttpOnly/i);
    expect(accessCookie).toMatch(/SameSite=Strict/i);
    expect(accessCookie).toMatch(/Path=\/;/);
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/Path=\/api\/auth/);

    // only the hash is stored
    const stored = await prisma.refreshToken.findFirstOrThrow();
    expect(stored.tokenHash).not.toBe(cookie(res, 'refresh_token'));
  });

  it('returns the same error for unknown user and wrong password', async () => {
    await createUser({ email: 'inv@example.com' });
    const unknown = await login('nobody@example.com').expect(401);
    const wrong = await login('inv@example.com', 'Wrong-Password-1').expect(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('accepts local phone formats for investor login', async () => {
    await createUser({ email: 'p@example.com', phone: '+8801712345678' });
    await login('01712345678').expect(200);
    await login('+880 1712-345678').expect(200);
  });

  it('rejects malformed login bodies', async () => {
    await http()
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ identifier: '' })
      .expect(400);
  });

  it('locks the account after 5 failures, even for the right password', async () => {
    await createUser({ email: 'lock@example.com' });
    for (let i = 0; i < 5; i++) {
      await login('lock@example.com', 'Wrong-Password-1').expect(401);
    }
    await login('lock@example.com').expect(429);
  });

  it('counts parallel failures atomically', async () => {
    await createUser({ email: 'race@example.com' });
    await Promise.all(
      Array.from({ length: 5 }, () => login('race@example.com', 'Wrong-Password-1')),
    );
    const row = await prisma.loginAttempt.findUniqueOrThrow({
      where: { identifier: 'race@example.com' },
    });
    expect(row.attempts).toBe(5);
    expect(row.blockedUntil).not.toBeNull();
  });

  it('refuses login for a deactivated account', async () => {
    const user = await createUser({ email: 'off@example.com' });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await login('off@example.com').expect(403);
  });

  // --- access token ------------------------------------------------------

  it('guards /me and rejects forged, tampered and alg=none tokens', async () => {
    await createUser({ email: 'inv@example.com' });
    const { access: token } = await loginTokens('inv@example.com');

    await http().get('/api/auth/me').expect(401);
    await http().get('/api/auth/me').set('Cookie', access(token)).expect(200);

    const [header, payload] = token.split('.');
    const forged = createHmac('sha256', 'wrong-secret-wrong-secret-wrong-secret')
      .update(`${header}.${payload}`)
      .digest('base64url');
    await http()
      .get('/api/auth/me')
      .set('Cookie', access(`${header}.${payload}.${forged}`))
      .expect(401);

    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    await http()
      .get('/api/auth/me')
      .set('Cookie', access(`${noneHeader}.${payload}.`))
      .expect(401);

    // Bearer header is not an accepted transport
    await http().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('kills existing tokens when the account is deactivated or its role changes', async () => {
    const user = await createUser({ email: 'inv@example.com' });
    const { access: token } = await loginTokens('inv@example.com');

    await prisma.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } });
    await http().get('/api/auth/me').set('Cookie', access(token)).expect(401);

    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.INVESTOR, isActive: false },
    });
    await http().get('/api/auth/me').set('Cookie', access(token)).expect(401);
  });

  // --- refresh -----------------------------------------------------------

  it('rotates refresh tokens and each one works once', async () => {
    await createUser({ email: 'inv@example.com' });
    const first = await loginTokens('inv@example.com');

    const res = await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(first.refresh))
      .expect(200);
    const second = cookie(res, 'refresh_token')!;
    const newAccess = cookie(res, 'access_token')!;
    expect(second).not.toBe(first.refresh);

    await http().get('/api/auth/me').set('Cookie', access(newAccess)).expect(200);

    // Immediate replay (inside grace window): rejected, session survives.
    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(first.refresh))
      .expect(401);
    await http().get('/api/auth/me').set('Cookie', access(newAccess)).expect(200);
  });

  it('treats a late replay of a used refresh token as theft and kills the session', async () => {
    await createUser({ email: 'inv@example.com' });
    const first = await loginTokens('inv@example.com');

    const res = await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(first.refresh))
      .expect(200);
    const second = cookie(res, 'refresh_token')!;
    const newAccess = cookie(res, 'access_token')!;

    // Pretend the first token was consumed a minute ago.
    await prisma.refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(first.refresh))
      .expect(401);

    // Legit holder's refresh token and access token are both dead now.
    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(second))
      .expect(401);
    await http().get('/api/auth/me').set('Cookie', access(newAccess)).expect(401);
  });

  it('lets only one of two concurrent refreshes win', async () => {
    await createUser({ email: 'inv@example.com' });
    const { refresh: token } = await loginTokens('inv@example.com');
    const results = await Promise.all(
      [0, 1].map(() =>
        http()
          .post('/api/auth/refresh')
          .set('Origin', ORIGIN)
          .set('Cookie', refresh(token)),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
  });

  it('does not extend the session past its absolute expiry', async () => {
    await createUser({ email: 'inv@example.com' });
    const { refresh: token } = await loginTokens('inv@example.com');
    const original = await prisma.refreshToken.findFirstOrThrow();

    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(token))
      .expect(200);
    const successor = await prisma.refreshToken.findFirstOrThrow({
      where: { revokedAt: null },
    });
    expect(successor.expiresAt.getTime()).toBe(original.expiresAt.getTime());
  });

  it('rejects an expired refresh token', async () => {
    await createUser({ email: 'inv@example.com' });
    const { refresh: token } = await loginTokens('inv@example.com');
    await prisma.refreshToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(token))
      .expect(401);
  });

  // --- logout ------------------------------------------------------------

  it('logout revokes the access token and the refresh token', async () => {
    await createUser({ email: 'inv@example.com' });
    const t = await loginTokens('inv@example.com');

    const res = await http()
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('Cookie', [access(t.access), refresh(t.refresh)])
      .expect(200);
    expect(cookiesOf(res).join(';')).toMatch(/access_token=;/);

    await http().get('/api/auth/me').set('Cookie', access(t.access)).expect(401);
    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(t.refresh))
      .expect(401);
  });

  it('logout succeeds even with no/garbage cookies', async () => {
    await http().post('/api/auth/logout').set('Origin', ORIGIN).expect(200);
    await http()
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('Cookie', [access('garbage'), refresh('garbage')])
      .expect(200);
  });

  it('logout-all ends every session', async () => {
    await createUser({ email: 'inv@example.com' });
    const a = await loginTokens('inv@example.com');
    const b = await loginTokens('inv@example.com');

    await http()
      .post('/api/auth/logout-all')
      .set('Origin', ORIGIN)
      .set('Cookie', access(a.access))
      .expect(200);

    await http().get('/api/auth/me').set('Cookie', access(b.access)).expect(401);
    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(b.refresh))
      .expect(401);
  });

  // --- change password ---------------------------------------------------

  it('change-password verifies the current password, ends other sessions, keeps this one', async () => {
    await createUser({ email: 'inv@example.com' });
    const other = await loginTokens('inv@example.com');
    const mine = await loginTokens('inv@example.com');

    await http()
      .post('/api/auth/change-password')
      .set('Origin', ORIGIN)
      .set('Cookie', access(mine.access))
      .send({ currentPassword: 'Wrong-Password-1', newPassword: 'Brand-New-Pass-2' })
      .expect(400);

    await http()
      .post('/api/auth/change-password')
      .set('Origin', ORIGIN)
      .set('Cookie', access(mine.access))
      .send({ currentPassword: PASSWORD, newPassword: 'weak' })
      .expect(400);

    const res = await http()
      .post('/api/auth/change-password')
      .set('Origin', ORIGIN)
      .set('Cookie', access(mine.access))
      .send({ currentPassword: PASSWORD, newPassword: 'Brand-New-Pass-2' })
      .expect(200);

    await http().get('/api/auth/me').set('Cookie', access(other.access)).expect(401);
    await http().get('/api/auth/me').set('Cookie', access(mine.access)).expect(401);
    await http()
      .get('/api/auth/me')
      .set('Cookie', access(cookie(res, 'access_token')!))
      .expect(200);

    await login('inv@example.com').expect(401);
    await login('inv@example.com', 'Brand-New-Pass-2').expect(200);
  });

  // --- CSRF --------------------------------------------------------------

  it('blocks state-changing requests from foreign origins', async () => {
    await createUser({ email: 'inv@example.com' });
    await http()
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ identifier: 'inv@example.com', password: PASSWORD })
      .expect(403);
    await http()
      .post('/api/auth/login')
      .set('Referer', 'https://evil.example/page')
      .send({ identifier: 'inv@example.com', password: PASSWORD })
      .expect(403);
  });

  // --- admin hardening ---------------------------------------------------

  it('enforces the admin IP allowlist at login and per request, and audits', async () => {
    const admin = await createUser({
      email: 'admin@example.com',
      role: Role.ADMIN,
      allowedIpRange: '10.0.0.0/8',
    });
    await login('admin@example.com').expect(403);

    await prisma.adminProfile.update({
      where: { userId: admin.id },
      data: { allowedIpRange: '127.0.0.1, ::1' },
    });
    const { access: token } = await loginTokens('admin@example.com');
    await http().get('/api/auth/me').set('Cookie', access(token)).expect(200);

    // Allowlist tightened mid-session → existing token stops working.
    await prisma.adminProfile.update({
      where: { userId: admin.id },
      data: { allowedIpRange: '10.0.0.0/8' },
    });
    await http().get('/api/auth/me').set('Cookie', access(token)).expect(401);

    const actions = (await prisma.auditLog.findMany()).map((a) => a.action).sort();
    expect(actions).toEqual(['admin_login', 'admin_login_failed']);

    const failed = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'admin_login_failed' },
    });
    expect(failed).toMatchObject({
      module: 'AUTH',
      status: 'FAILED',
      targetId: admin.id,
      metadata: { reason: 'ip_not_allowed' },
    });
    expect(failed.ipAddress).toMatch(/127\.0\.0\.1|::1/);
  });

  it('fails closed on a malformed allowlist', async () => {
    await createUser({
      email: 'admin@example.com',
      role: Role.ADMIN,
      allowedIpRange: '127.0.0.1, not-an-ip',
    });
    await login('admin@example.com').expect(403);
  });

  it('gives admins a shorter session than investors', async () => {
    await createUser({ email: 'inv@example.com' });
    await createUser({ email: 'admin@example.com', role: Role.ADMIN });
    await loginTokens('inv@example.com');
    await loginTokens('admin@example.com');
    const [inv, adm] = await Promise.all([
      prisma.refreshToken.findFirstOrThrow({ where: { user: { role: Role.INVESTOR } } }),
      prisma.refreshToken.findFirstOrThrow({ where: { user: { role: Role.ADMIN } } }),
    ]);
    const hours = (d: Date) => (d.getTime() - Date.now()) / 3_600_000;
    expect(Math.round(hours(inv.expiresAt))).toBe(168);
    expect(Math.round(hours(adm.expiresAt))).toBe(8);
  });

  // --- /investor ownership (IDOR) + roles ---------------------------------

  it('lets an investor read only their own profile', async () => {
    const a = await createUser({ email: 'a@example.com', withInvestor: true });
    const b = await createUser({ email: 'b@example.com', withInvestor: true });
    const { access: token } = await loginTokens('a@example.com');

    await http()
      .get(`/api/investor/${a.investorProfile!.id}`)
      .set('Cookie', access(token))
      .expect(200);
    await http()
      .get(`/api/investor/${b.investorProfile!.id}`)
      .set('Cookie', access(token))
      .expect(403);
    await http()
      .get('/api/investor/00000000-0000-4000-8000-000000000000')
      .set('Cookie', access(token))
      .expect(403);
  });

  // --- forgot / reset password ---------------------------------------------

  function forgot(identifier: string) {
    return http()
      .post('/api/auth/forgot-password')
      .set('Origin', ORIGIN)
      .send({ identifier });
  }

  function reset(token: string, newPassword: string) {
    return http()
      .post('/api/auth/reset-password')
      .set('Origin', ORIGIN)
      .send({ token, newPassword });
  }

  it('forgot-password answers identically for known and unknown accounts', async () => {
    await createUser({ email: 'inv@example.com' });
    const known = await forgot('inv@example.com').expect(200);
    const unknown = await forgot('nobody@example.com').expect(200);
    await flush();
    expect(known.body).toEqual(unknown.body);
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0]).toMatchObject({ kind: 'reset', to: 'inv@example.com' });
  });

  it('puts the token in the URL fragment and stores only its hash', async () => {
    await createUser({ email: 'inv@example.com' });
    await forgot('inv@example.com').expect(200);
    await flush();
    const url = new URL(sentMail[0].link);
    expect(url.origin + url.pathname).toBe(`${ORIGIN}/reset-password`);
    expect(url.search).toBe('');
    const stored = await prisma.passwordToken.findFirstOrThrow();
    expect(stored.tokenHash).not.toBe(tokenFrom(sentMail[0].link));
  });

  it('resets via phone lookup, ends all sessions, and the link works once', async () => {
    await createUser({ email: 'inv@example.com', phone: '+8801712345678' });
    const session = await loginTokens('inv@example.com');

    await forgot('01712345678').expect(200);
    await flush();
    const token = tokenFrom(sentMail[0].link);

    await reset(token, 'weak').expect(400);
    await reset(token, 'Brand-New-Pass-2').expect(200);
    await reset(token, 'Another-Pass-3').expect(400); // single use

    await http().get('/api/auth/me').set('Cookie', access(session.access)).expect(401);
    await http()
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', refresh(session.refresh))
      .expect(401);
    await login('inv@example.com').expect(401);
    await login('inv@example.com', 'Brand-New-Pass-2').expect(200);
  });

  it('only lets one of two concurrent resets with the same link succeed', async () => {
    await createUser({ email: 'inv@example.com' });
    await forgot('inv@example.com').expect(200);
    await flush();
    const token = tokenFrom(sentMail[0].link);
    const results = await Promise.all([
      reset(token, 'Brand-New-Pass-2'),
      reset(token, 'Brand-New-Pass-3'),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });

  it('rejects expired, unknown and superseded links', async () => {
    await createUser({ email: 'inv@example.com' });
    await forgot('inv@example.com').expect(200);
    await flush();
    const first = tokenFrom(sentMail[0].link);

    await reset('x'.repeat(43), 'Brand-New-Pass-2').expect(400);

    // A newer link invalidates the older one (bypass the 60s cooldown).
    await prisma.passwordToken.updateMany({
      data: { createdAt: new Date(Date.now() - 120_000) },
    });
    await forgot('inv@example.com').expect(200);
    await flush();
    const second = tokenFrom(sentMail[1].link);
    await reset(first, 'Brand-New-Pass-2').expect(400);

    await prisma.passwordToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await reset(second, 'Brand-New-Pass-2').expect(400);
  });

  it('sends at most one reset email per minute per account', async () => {
    await createUser({ email: 'inv@example.com' });
    await forgot('inv@example.com').expect(200);
    await forgot('inv@example.com').expect(200);
    await forgot('INV@example.com').expect(200);
    await flush();
    expect(sentMail).toHaveLength(1);
  });

  it('sends nothing for a deactivated account and still answers 200', async () => {
    const user = await createUser({ email: 'off@example.com' });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await forgot('off@example.com').expect(200);
    await flush();
    expect(sentMail).toHaveLength(0);
  });

  it('answers 200 even when the email provider is down', async () => {
    await createUser({ email: 'inv@example.com' });
    mailShouldFail = true;
    await forgot('inv@example.com').expect(200);
    await flush();
  });

  it('a completed reset clears an account lockout', async () => {
    await createUser({ email: 'lock@example.com' });
    for (let i = 0; i < 5; i++) {
      await login('lock@example.com', 'Wrong-Password-1').expect(401);
    }
    await login('lock@example.com').expect(429);

    await forgot('lock@example.com').expect(200);
    await flush();
    await reset(tokenFrom(sentMail[0].link), 'Brand-New-Pass-2').expect(200);
    await login('lock@example.com', 'Brand-New-Pass-2').expect(200);
  });

  // --- admin accounts (SUPER_ADMIN only) ------------------------------------

  const newAdmin = {
    email: 'New.Admin@Example.com',
    name: 'New Admin',
    role: 'ADMIN',
    department: 'Finance',
  };

  function createAdmin(accessToken: string, body: object) {
    return http()
      .post('/api/admin/accounts')
      .set('Origin', ORIGIN)
      .set('Cookie', access(accessToken))
      .send(body);
  }

  it('only SUPER_ADMIN can create admin accounts', async () => {
    await createUser({ email: 'inv@example.com' });
    await createUser({ email: 'admin@example.com', role: Role.ADMIN });
    const inv = await loginTokens('inv@example.com');
    const admin = await loginTokens('admin@example.com');

    await http().post('/api/admin/accounts').set('Origin', ORIGIN).send(newAdmin).expect(401);
    await createAdmin(inv.access, newAdmin).expect(403);
    await createAdmin(admin.access, newAdmin).expect(403);
    expect(await prisma.user.count({ where: { email: 'new.admin@example.com' } })).toBe(0);
  });

  it('creates an admin who sets their own password via the invite link', async () => {
    await createUser({ email: 'root@example.com', role: Role.SUPER_ADMIN });
    const root = await loginTokens('root@example.com');

    const res = await createAdmin(root.access, {
      ...newAdmin,
      allowedIpRange: '127.0.0.1, ::1',
    }).expect(201);
    expect(res.body.inviteEmailSent).toBe(true);
    expect(res.body.admin).toMatchObject({
      email: 'new.admin@example.com',
      role: 'ADMIN',
      adminProfile: { name: 'New Admin', department: 'Finance' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|token/i);

    expect(sentMail).toHaveLength(1);
    expect(sentMail[0]).toMatchObject({ kind: 'invite', to: 'new.admin@example.com' });
    expect(new URL(sentMail[0].link).pathname).toBe('/set-password');

    // Can't log in with anything before accepting the invite.
    await login('new.admin@example.com', PASSWORD).expect(401);

    await reset(tokenFrom(sentMail[0].link), 'Admins-Own-Pass-1').expect(200);
    const loggedIn = await login('new.admin@example.com', 'Admins-Own-Pass-1').expect(200);
    expect(loggedIn.body.user.role).toBe('ADMIN');

    const actions = (await prisma.auditLog.findMany()).map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining(['admin_created', 'admin_invite_accepted', 'admin_login']),
    );
    const created = await prisma.auditLog.findFirstOrThrow({ where: { action: 'admin_created' } });
    const rootProfile = await prisma.adminProfile.findFirstOrThrow({
      where: { user: { email: 'root@example.com' } },
    });
    expect(created.adminProfileId).toBe(rootProfile.id);
  });

  it('refuses SUPER_ADMIN creation, duplicate emails and bad allowlists', async () => {
    await createUser({ email: 'root@example.com', role: Role.SUPER_ADMIN });
    await createUser({ email: 'taken@example.com' });
    const root = await loginTokens('root@example.com');

    await createAdmin(root.access, { ...newAdmin, role: 'SUPER_ADMIN' }).expect(400);
    await createAdmin(root.access, { ...newAdmin, role: 'INVESTOR' }).expect(400);
    await createAdmin(root.access, { ...newAdmin, email: 'TAKEN@example.com' }).expect(409);
    await createAdmin(root.access, { ...newAdmin, allowedIpRange: '10.0.0.0/33' }).expect(400);
    await createAdmin(root.access, { ...newAdmin, allowedIpRange: 'office' }).expect(400);
    await createAdmin(root.access, { ...newAdmin, email: 'not-an-email' }).expect(400);
    expect(sentMail).toHaveLength(0);
  });

  it('still creates the admin if the invite email fails, and resend works', async () => {
    await createUser({ email: 'root@example.com', role: Role.SUPER_ADMIN });
    const root = await loginTokens('root@example.com');

    mailShouldFail = true;
    const res = await createAdmin(root.access, newAdmin).expect(201);
    expect(res.body.inviteEmailSent).toBe(false);

    mailShouldFail = false;
    const resent = await http()
      .post(`/api/admin/accounts/${res.body.admin.id}/resend-invite`)
      .set('Origin', ORIGIN)
      .set('Cookie', access(root.access))
      .expect(200);
    expect(resent.body.inviteEmailSent).toBe(true);
    await reset(tokenFrom(sentMail[0].link), 'Admins-Own-Pass-1').expect(200);
  });

  it('resend-invite refuses investors, unknown ids, and admins who already logged in', async () => {
    await createUser({ email: 'root@example.com', role: Role.SUPER_ADMIN });
    const inv = await createUser({ email: 'inv@example.com' });
    const active = await createUser({ email: 'active@example.com', role: Role.ADMIN });
    await loginTokens('active@example.com');
    const root = await loginTokens('root@example.com');

    const resend = (id: string) =>
      http()
        .post(`/api/admin/accounts/${id}/resend-invite`)
        .set('Origin', ORIGIN)
        .set('Cookie', access(root.access));

    await resend(inv.id).expect(404);
    await resend('00000000-0000-4000-8000-000000000000').expect(404);
    await resend(active.id).expect(409);
    expect(sentMail).toHaveLength(0);
  });

  it('keeps non-investor roles off /investor but lets SUPER_ADMIN through', async () => {
    const inv = await createUser({ email: 'a@example.com', withInvestor: true });
    await createUser({ email: 'admin@example.com', role: Role.ADMIN });
    await createUser({ email: 'root@example.com', role: Role.SUPER_ADMIN });

    const admin = await loginTokens('admin@example.com');
    const root = await loginTokens('root@example.com');
    const path = `/api/investor/${inv.investorProfile!.id}`;

    await http().get(path).set('Cookie', access(admin.access)).expect(403);
    await http().get(path).set('Cookie', access(root.access)).expect(200);
  });
});
