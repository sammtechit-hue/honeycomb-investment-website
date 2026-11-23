import type { Metadata } from 'next';
import { INVESTOR_NAV } from '@/components/dashboard/nav-items';
import { DashboardShell, categoryLabel } from '@/components/dashboard/shell';
import { requireInvestor } from '@/lib/investor';

export const metadata: Metadata = {
  title: 'Dashboard · HoneyComb Investor',
};

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const { user, profile } = await requireInvestor('/dashboard');

  return (
    <DashboardShell
      area="Investor"
      nav={INVESTOR_NAV}
      signInHref="/login"
      name={profile.fullname}
      subtitle={profile.user.phone ?? user.email}
      badge={profile.category ? `${categoryLabel(profile.category)} tier` : undefined}
    >
      {children}
    </DashboardShell>
  );
}
