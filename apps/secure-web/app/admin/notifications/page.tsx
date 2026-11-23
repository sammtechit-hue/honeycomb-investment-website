import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, EmptyState, PageHeader } from '@/components/dashboard/ui';
import { requireStaff } from '@/lib/admin';
import { formatDate, formatTime } from '@/lib/format';
import { PAGE_SIZE } from '@/lib/list-query';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABEL,
  isNotificationType,
  listNotifications,
  notificationTarget,
  paymentInvestments,
} from '@/lib/notifications';
import { SimplePagination, linkClass, one, pageParam } from '../payouts/ui';

export const metadata: Metadata = {
  title: 'Notifications · HoneyComb Admin',
};

const PATH = '/admin/notifications';

const fieldClass =
  'h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink outline-none placeholder:text-placeholder focus:border-black';

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' });

export default async function AdminNotificationsPage(props: PageProps<'/admin/notifications'>) {
  await requireStaff(PATH);
  const params = await props.searchParams;
  const search = (one(params.q) ?? '').trim().slice(0, 150);
  const rawType = one(params.type);
  const type = isNotificationType(rawType) ? rawType : undefined;
  const oldest = one(params.sort) === 'oldest';
  const page = pageParam(params.page);

  const { data: notifications, meta } = await listNotifications(
    { ...(search && { search }), ...(type && { type }) },
    oldest ? 'asc' : 'desc',
    page,
    PAGE_SIZE,
    PATH,
  );

  const targets = new Map(notifications.map((n) => [n.id, notificationTarget(n)]));
  const paymentIds = [...targets.values()].flatMap((t) => (t?.kind === 'payment' ? [t.paymentId] : []));
  const investmentOfPayment = paymentIds.length ? await paymentInvestments(paymentIds, PATH) : new Map();

  function linkFor(id: string) {
    const t = targets.get(id);
    if (!t) return null;
    if (t.kind === 'link') return { href: t.href, label: t.label };
    const investmentId = investmentOfPayment.get(t.paymentId);
    return investmentId
      ? { href: `/admin/investments/${investmentId}`, label: 'Open investment' }
      : { href: '/admin/payments?status=all', label: 'Open payments' };
  }

  // Group the page by Bangladesh calendar day.
  const days: { key: string; label: string; items: typeof notifications }[] = [];
  for (const n of notifications) {
    const key = dayKey.format(new Date(n.createdAt));
    const last = days.at(-1);
    if (last?.key === key) last.items.push(n);
    else days.push({ key, label: formatDate(n.createdAt), items: [n] });
  }

  const query = {
    ...(search && { q: search }),
    ...(type && { type }),
    ...(oldest && { sort: 'oldest' }),
  };
  const hrefFor = (p: number) => `${PATH}?${new URLSearchParams({ ...query, page: String(p) })}`;
  const filtered = !!(search || type);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Notifications"
        description="What the platform has told the team: new applications and investments, payments, investor updates and payout runs."
      />

      <Card>
        <form method="get" action={PATH} className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center">
          <label htmlFor="notif-q" className="sr-only">
            Search
          </label>
          <input
            id="notif-q"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={150}
            placeholder="Search the message"
            className={`${fieldClass} w-full sm:w-72`}
          />
          <label htmlFor="notif-type" className="sr-only">
            Type
          </label>
          <select id="notif-type" name="type" defaultValue={type ?? ''} className={fieldClass}>
            <option value="">All types</option>
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {NOTIFICATION_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <label htmlFor="notif-sort" className="sr-only">
            Sort
          </label>
          <select id="notif-sort" name="sort" defaultValue={oldest ? 'oldest' : 'newest'} className={fieldClass}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button
            type="submit"
            className="h-10 rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
          >
            Apply
          </button>
          {(filtered || oldest) && (
            <Link href={PATH} className="flex h-10 items-center text-sm leading-5 text-muted underline">
              Clear
            </Link>
          )}
        </form>

        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            body={
              filtered
                ? 'Try another search or type.'
                : 'Notifications appear here when investors apply, invest or pay, and when payout runs finish.'
            }
          />
        ) : (
          days.map((day) => (
            <section key={day.key} aria-labelledby={`day-${day.key}`}>
              <h2
                id={`day-${day.key}`}
                className="border-b border-hairline bg-surface px-5 py-2 text-xs leading-4 tracking-[0.6px] text-muted uppercase"
              >
                {day.label}
              </h2>
              <ul className="divide-y divide-hairline">
                {day.items.map((n) => {
                  const link = linkFor(n.id);
                  return (
                    <li key={n.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="outline">{NOTIFICATION_TYPE_LABEL[n.type] ?? n.type}</Badge>
                          <span className="text-xs leading-4 text-muted tabular-nums">{formatTime(n.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-5 break-words text-ink">{n.message || 'No message.'}</p>
                      </div>
                      {link && (
                        <Link href={link.href} className={`${linkClass} shrink-0 text-sm leading-5`}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <SimplePagination
          hrefFor={hrefFor}
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          noun={['notification', 'notifications']}
        />
      </Card>
    </>
  );
}
