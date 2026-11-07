import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot password · HoneyComb Investor',
};

// /forgot-password        — shareholders (mobile number, email optional)
// /forgot-password?as=staff — linked from /staff/login (email)
export default async function ForgotPasswordPage({ searchParams }: PageProps<'/forgot-password'>) {
  const { as } = await searchParams;
  const staff = as === 'staff';

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a link to choose a new password."
    >
      <ForgotPasswordForm
        initialMethod={staff ? 'email' : 'phone'}
        signInHref={staff ? '/staff/login' : '/login'}
      />
    </AuthShell>
  );
}
