import type { Metadata } from 'next';
import { ADMIN_NAV } from '@/components/dashboard/nav-items';
import { DashboardShell } from '@/components/dashboard/shell';
import { ROLE_LABEL, requireStaff } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'Admin · HoneyComb',
  robots: { index: false, follow: false },
};

// Every /admin page re-checks staff access itself (requireStaff); this
// layout check covers the frame.
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await requireStaff('/admin');

  return (
    <DashboardShell
      area="Admin"
      nav={ADMIN_NAV}
      signInHref="/staff/login"
      name={user.email}
      subtitle={ROLE_LABEL[user.role]}
    >
      {children}
    </DashboardShell>
  );
}
