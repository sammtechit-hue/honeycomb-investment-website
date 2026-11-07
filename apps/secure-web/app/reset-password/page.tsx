import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { SetPasswordForm } from '@/components/set-password-form';

export const metadata: Metadata = {
  title: 'Choose a new password · HoneyComb Investor',
  // The link carries a one-time token; never let it be indexed or leak via Referer.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// Target of the forgot-password email: /reset-password#token=…
export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="This signs you out on every device.">
      <SetPasswordForm purpose="reset" />
    </AuthShell>
  );
}
