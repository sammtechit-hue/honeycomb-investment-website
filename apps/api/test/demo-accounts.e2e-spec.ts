// Demo accounts (packages/contracts/src/demo-accounts.ts) have a public
// password, so a production API must refuse them — answered exactly like an
// unknown account — while development keeps them usable.
//
// Same disposable-database setup as auth.e2e-spec.ts:
//   pnpm --filter api test:e2e -- demo-accounts
// Skipped when TEST_DATABASE_URL is unset.
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { Role } from '@investment-platform/db';
import {
  DEMO_PASSWORD,
  DEMO_SHAREHOLDERS,
  DEMO_STAFF,
} from '@investment-platform/contracts/demo-accounts';
import { validateEnv } from '../src/config/env';
import { configureApp } from '../src/app.setup';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/auth/auth.module';
import { MailModule } from '../src/mail/mail.module';
import { MailService } from '../src/mail/mail.service';

const TEST_DB = process.env.TEST_DATABASE_URL;
const describeIfDb = TEST_DB ? describe : describe.skip;

const ORIGIN = 'http://localhost:3001';
const shareholder = DEMO_SHAREHOLDERS[0];
const staff = DEMO_STAFF[0];

async function bootApp(nodeEnv: 'production' | 'test') {
  process.env.DATABASE_URL = TEST_DB;
  process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('base64');
  process.env.CORS_ORIGINS = ORIGIN;
  process.env.NODE_ENV = nodeEnv;
  // Required when NODE_ENV=production (config/env.ts); mail is faked below.
  process.env.RESEND_API_KEY = 're_test';
  process.env.MAIL_FROM = 'Test <no-reply@example.com>';
  process.env.APP_URL = ORIGIN;

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validate: validateEnv }),
      PrismaModule,
      MailModule,
      AuthModule,
    ],
  })
    .overrideProvider(MailService)
    .useValue({ sendPasswordReset: async () => {}, sendAdminInvite: async () => {} })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

describeIfDb('Demo accounts (e2e)', () => {
  let prisma: PrismaService;
  let app: NestExpressApplication | undefined;

  const login = (identifier: string, password = DEMO_PASSWORD) =>
    request(app!.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ identifier, password });

  async function seed() {
    await prisma.$transaction([
      prisma.loginAttempt.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.investor.deleteMany(),
      prisma.adminProfile.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 4);
    await prisma.user.create({
      data: { email: shareholder.email, phone: shareholder.phone, passwordHash, role: Role.INVESTOR },
    });
    await prisma.user.create({
      data: {
        email: staff.email,
        passwordHash,
        role: Role.SUPER_ADMIN,
        adminProfile: { create: { name: staff.name } },
      },
    });
    // An ordinary account with the same password, to show only demo
    // accounts are affected.
    await prisma.user.create({
      data: { email: 'real@example.com', phone: '01812345678', passwordHash, role: Role.INVESTOR },
    });
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe('NODE_ENV=production', () => {
    beforeEach(async () => {
      app = await bootApp('production');
      prisma = app.get(PrismaService);
      await seed();
    });

    it('refuses demo shareholders and staff exactly like an unknown account', async () => {
      const unknown = await login('nobody@example.com').expect(401);
      const byPhone = await login(shareholder.phone!).expect(401);
      const byEmail = await login(shareholder.email).expect(401);
      const staffLogin = await login(staff.email).expect(401);

      for (const res of [byPhone, byEmail, staffLogin]) {
        expect(res.body.message).toBe(unknown.body.message);
        expect(res.headers['set-cookie']).toBeUndefined();
      }
      expect(await prisma.refreshToken.count()).toBe(0);
    });

    it('still logs ordinary accounts in', async () => {
      await login('01812345678').expect(200);
    });
  });

  describe('NODE_ENV=test (non-production)', () => {
    beforeEach(async () => {
      app = await bootApp('test');
      prisma = app.get(PrismaService);
      await seed();
    });

    it('logs demo shareholders and staff in', async () => {
      await login(shareholder.phone!).expect(200);
      await login(staff.email).expect(200);
    });
  });
});
