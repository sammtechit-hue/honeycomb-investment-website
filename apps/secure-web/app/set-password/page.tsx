import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { SetPasswordForm } from '@/components/set-password-form';

export const metadata: Metadata = {
  title: 'Set your password · HoneyComb Investor',
  // The link carries a one-time token; never let it be indexed or leak via Referer.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// Target of the staff invite email a super admin triggers: /set-password#token=…
export default function SetPasswordPage() {
  return (
    <AuthShell title="Set your password" subtitle="Finish setting up your HoneyComb staff account.">
      <SetPasswordForm purpose="invite" />
    </AuthShell>
  );
}
