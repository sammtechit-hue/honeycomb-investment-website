// Sidebar entries for the two signed-in areas. Plain data (not in the
// 'use client' nav module) so server layouts can pass it as a prop.

export type NavItem = {
  href: string;
  label: string;
  // SVG path data for a 24×24 stroked icon.
  icon: string;
  // Admins and super admins only (the API refuses moderators).
  adminOnly?: boolean;
};

export const INVESTOR_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z' },
  { href: '/dashboard/investments', label: 'My investments', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
  { href: '/dashboard/profit', label: 'Profit history', icon: 'M4 4h16v16H4zM4 9h16M9 9v11' },
  { href: '/dashboard/profile', label: 'Profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0' },
  { href: '/dashboard/security', label: 'Security', icon: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4' },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z' },
  {
    href: '/admin/investors',
    label: 'Investors',
    icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3',
  },
  { href: '/admin/investments', label: 'Investments', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
  { href: '/admin/payments', label: 'Payments', icon: 'M2 6h20v12H2zM2 10h20M6 15h4' },
  { href: '/admin/payouts', label: 'Payouts', icon: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
  {
    href: '/admin/referrals',
    label: 'Referrals',
    icon: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10a6 6 0 0 1 12 0M19 8v6M16 11h6',
  },
  {
    href: '/admin/leads',
    label: 'ROI leads',
    icon: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z',
  },
  { href: '/admin/change-requests', label: 'Change requests', icon: 'M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4' },
  {
    href: '/admin/notifications',
    label: 'Notifications',
    icon: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  },
  { href: '/admin/projects', label: 'Projects', icon: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18' },
  { href: '/admin/rates', label: 'Monthly rates', icon: 'M19 5 5 19M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z' },
  {
    href: '/admin/settings',
    label: 'Profit settings',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5 7 17M17 17l1.5 1.5M5.5 5.5 7 7',
  },
  {
    href: '/admin/audit',
    label: 'Audit log',
    icon: 'M9 4h6v3H9zM6 5.5H5v15h14v-15h-1M8.5 12h7M8.5 16h5',
    adminOnly: true,
  },
];

// The admin nav for one staff role: moderators don't get admin-only pages.
export function adminNavFor(role: 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN') {
  return role === 'MODERATOR' ? ADMIN_NAV.filter((n) => !n.adminOnly) : ADMIN_NAV;
}
