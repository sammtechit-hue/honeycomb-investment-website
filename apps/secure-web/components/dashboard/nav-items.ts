// Sidebar entries for the two signed-in areas. Plain data (not in the
// 'use client' nav module) so server layouts can pass it as a prop.

export type NavItem = {
  href: string;
  label: string;
  // SVG path data for a 24×24 stroked icon.
  icon: string;
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
  { href: '/admin/change-requests', label: 'Change requests', icon: 'M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4' },
];
