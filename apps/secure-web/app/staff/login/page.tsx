import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';
import { demoLogins } from '@/lib/demo-logins';
import { safeNextPath } from '@/lib/safe-next';
import { redirectIfSignedIn } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Staff sign in · HoneyComb Investor',
  // Not linked from the shareholder pages; keep it out of search results too.
  robots: { index: false, follow: false },
};

// Admins, moderators and super admins. Staff accounts are created by a super
// admin (invite email → /set-password), never through sign-up.
export default async function StaffLoginPage({ searchParams }: PageProps<'/staff/login'>) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === 'string' ? next : null);
  await redirectIfSignedIn(nextPath);

  return (
    <AuthShell title="Staff sign in" subtitle="For HoneyComb administrators and moderators.">
      <LoginForm variant="staff" next={nextPath} demoLogins={demoLogins('staff')} />
    </AuthShell>
  );
}
