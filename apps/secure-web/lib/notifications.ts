import { getJson, getPage, type Page } from './server-api';

// Server-side reads for the admin notifications feed. Shapes mirror
// apps/api/src/admin/admin-notification/admin-notification.service.ts, which
// returns the whole Prisma row. The endpoint is mounted at /admin-notification
// (not under /admin) and is read-only: there's no way to mark one as read yet.

export const NOTIFICATION_TYPES = [
  'new_investment_request',
  'investor_action',
  'incoming_payments',
  'monthly_profit_cycle',
  'disbursement_sent',
  'upcoming_payout',
  'slot_reminder',
  'company_document_expiring',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  new_investment_request: 'New application or investment',
  investor_action: 'Investor update',
  incoming_payments: 'Payment received',
  monthly_profit_cycle: 'Monthly profit run',
  disbursement_sent: 'Payout items prepared',
  upcoming_payout: 'Upcoming payout',
  slot_reminder: 'Payout reminder',
  company_document_expiring: 'Document expiring',
};

export function isNotificationType(v: string | undefined): v is NotificationType {
  return !!v && (NOTIFICATION_TYPES as readonly string[]).includes(v);
}

export type AdminNotification = {
  id: string;
  type: NotificationType;
  referenceId: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  // A path written by the API. Most don't match this app's routes
  // (/admin/incoming-payment/…, /admin/monthly-rate-setting), so it is only
  // ever read through notificationTarget, never used as a link directly.
  clickLink: string | null;
};

const PATH = '/admin-notification';

export function listNotifications(
  filters: { search?: string; type?: NotificationType },
  sortOrder: 'asc' | 'desc',
  page: number,
  limit: number,
  returnTo: string,
): Promise<Page<AdminNotification>> {
  return getPage<AdminNotification>(
    PATH,
    new URLSearchParams({
      ...(filters.search && { search: filters.search }),
      ...(filters.type && { type: filters.type }),
      sortBy: 'createdAt',
      sortOrder,
      page: String(page),
      limit: String(limit),
    }),
    returnTo,
  );
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// Where a notification should take staff in this app, or null when there's
// no page for it. Payments have no page of their own: they are shown on their
// investment, which is looked up separately (see paymentInvestments).
export type NotificationTarget =
  | { kind: 'link'; href: string; label: string }
  | { kind: 'payment'; paymentId: string }
  | null;

const STATIC_TARGETS: Record<string, { href: string; label: string }> = {
  '/admin/disbursement-item': { href: '/admin/payouts/items', label: 'Open payout items' },
  '/admin/monthly-profit-ledger': { href: '/admin/payouts/items', label: 'Open payout items' },
  '/admin/monthly-rate-setting': { href: '/admin/rates', label: 'Open monthly rates' },
};

export function notificationTarget(n: Pick<AdminNotification, 'clickLink'>): NotificationTarget {
  const link = (n.clickLink ?? '').trim();
  let m: RegExpMatchArray | null;
  if ((m = link.match(new RegExp(`^/admin/investors/(${UUID})$`, 'i')))) {
    return { kind: 'link', href: `/admin/investors/${m[1]}`, label: 'Open investor' };
  }
  if ((m = link.match(new RegExp(`^/admin/investments?/(${UUID})$`, 'i')))) {
    return { kind: 'link', href: `/admin/investments/${m[1]}`, label: 'Open investment' };
  }
  if ((m = link.match(new RegExp(`^/admin/incoming-payments?/(${UUID})$`, 'i')))) {
    return { kind: 'payment', paymentId: m[1] };
  }
  const fixed = STATIC_TARGETS[link];
  return fixed ? { kind: 'link', ...fixed } : null;
}

// The investment behind each payment, so a payment notification can open it.
// One read per payment on the page (at most a page's worth), in parallel.
export async function paymentInvestments(paymentIds: string[], returnTo: string) {
  const unique = [...new Set(paymentIds)];
  const found = await Promise.all(
    unique.map(async (id) => {
      const res = await getJson<{ data: { investmentId: string } }>(`/admin/incoming-payment/${id}`, returnTo);
      return [id, res?.data.investmentId ?? null] as const;
    }),
  );
  return new Map(found);
}
