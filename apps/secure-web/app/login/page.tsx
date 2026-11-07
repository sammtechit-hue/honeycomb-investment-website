import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';
import { demoLogins } from '@/lib/demo-logins';
import { safeNextPath } from '@/lib/safe-next';
import { redirectIfSignedIn } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Sign in · HoneyComb Investor',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === 'string' ? next : null);
  await redirectIfSignedIn(nextPath);

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your shareholder dashboard."
      below={
        <p className="flex gap-1 pt-6 text-center text-sm leading-5">
          <span className="text-muted">New here?</span>
          <Link href="/signup" className="font-bold underline decoration-rule underline-offset-2">
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm variant="shareholder" next={nextPath} demoLogins={demoLogins('shareholder')} />
    </AuthShell>
  );
}
