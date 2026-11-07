// Demo logins for LOCAL DEVELOPMENT ONLY. One list, used in three places:
//   - apps/api/scripts/seed-demo.mts creates them (and refuses to run
//     against anything but a localhost database)
//   - the API refuses to log any of them in when NODE_ENV=production, so a
//     demo account that somehow reached a real database is still useless
//   - secure-web's /login and /staff/login list them when NODE_ENV=development
//
// The password is public (it's in this repo), which is exactly why every one
// of these guards exists. The .test TLD is reserved (RFC 2606): mail to these
// addresses can never be delivered to a real inbox.

export const DEMO_PASSWORD = 'Demo@1234';

export const DEMO_EMAIL_DOMAIN = 'honeycomb.test';

export type DemoAccountRole = 'INVESTOR' | 'ADMIN' | 'MODERATOR' | 'SUPER_ADMIN';

export interface DemoAccount {
  role: DemoAccountRole;
  email: string;
  // Investors sign in with this (01XXXXXXXXX, the stored format); staff
  // have no phone and sign in with email.
  phone: string | null;
  name: string;
  // Shown next to the login on the dev panel.
  description: string;
  // Investors only: null = no profile yet (lands on the verification
  // wizard); 'active' = verified and approved.
  investorStatus?: null | 'active';
}

export const DEMO_SHAREHOLDERS: readonly DemoAccount[] = [
  {
    role: 'INVESTOR',
    email: `shareholder.new@${DEMO_EMAIL_DOMAIN}`,
    phone: '01700000001',
    name: 'Demo New Shareholder',
    description: 'Just signed up, verification not started',
    investorStatus: null,
  },
  {
    role: 'INVESTOR',
    email: `shareholder.verified@${DEMO_EMAIL_DOMAIN}`,
    phone: '01700000002',
    name: 'Demo Verified Shareholder',
    description: 'Verified and active',
    investorStatus: 'active',
  },
];

export const DEMO_STAFF: readonly DemoAccount[] = [
  {
    role: 'SUPER_ADMIN',
    email: `superadmin@${DEMO_EMAIL_DOMAIN}`,
    phone: null,
    name: 'Demo Super Admin',
    description: 'Full access, can create staff',
  },
  {
    role: 'ADMIN',
    email: `admin@${DEMO_EMAIL_DOMAIN}`,
    phone: null,
    name: 'Demo Admin',
    description: 'Admin',
  },
  {
    role: 'MODERATOR',
    email: `moderator@${DEMO_EMAIL_DOMAIN}`,
    phone: null,
    name: 'Demo Moderator',
    description: 'Moderator',
  },
];

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [...DEMO_SHAREHOLDERS, ...DEMO_STAFF];

// Matches on the account's email, whichever identifier was used to log in.
export function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}
