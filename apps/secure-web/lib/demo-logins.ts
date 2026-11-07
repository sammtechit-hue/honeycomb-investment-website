import { DEMO_PASSWORD, DEMO_SHAREHOLDERS, DEMO_STAFF } from '@investment-platform/contracts/demo-accounts';

// What the sign-in pages offer as one-click demo logins. Server-only, and
// undefined outside `next dev`, so a production build never renders or
// ships them to the browser. The accounts only exist once
// `pnpm --filter api seed:demo` has been run against the local database.
export type DemoLogin = {
  // Exactly what goes in the identifier field: the mobile number after the
  // fixed +880 prefix, or the staff email.
  identifier: string;
  password: string;
  label: string;
  description: string;
};

export function demoLogins(kind: 'shareholder' | 'staff'): DemoLogin[] | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined;

  const accounts = kind === 'shareholder' ? DEMO_SHAREHOLDERS : DEMO_STAFF;
  return accounts.map((account) => ({
    identifier: account.phone ? account.phone.replace(/^0/, '') : account.email,
    password: DEMO_PASSWORD,
    label: account.name,
    description: account.description,
  }));
}
