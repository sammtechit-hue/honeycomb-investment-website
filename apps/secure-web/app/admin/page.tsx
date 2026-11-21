import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/ui';
import { getQueueCounts, requireStaff } from '@/lib/admin';
import { formatTaka } from '@/lib/format';

function Queue({
  href,
  label,
  count,
  hint,
  detail,
}: {
  href: string;
  label: string;
  count: number;
  hint: string;
  // Extra line under the count (an amount, a warning).
  detail?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-hairline bg-white p-5 drop-shadow-[0px_4px_12px_rgba(0,0,0,0.03)] hover:border-black"
    >
      <p className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{label}</p>
      <p className="text-2xl leading-8 font-bold tracking-[-0.6px] text-ink tabular-nums">{count}</p>
      {detail && <p className="text-sm leading-5 font-semibold text-ink tabular-nums">{detail}</p>}
      <p className="text-xs leading-4 text-muted">{count === 0 ? 'Nothing waiting' : hint}</p>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm leading-5 font-semibold text-ink">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

export default async function AdminOverviewPage() {
  await requireStaff('/admin');
  const counts = await getQueueCounts('/admin');
  const items = counts.unbatchedItems;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" description="Work waiting for the team. Open a card to see the list." />

      <Section title="Investors and payments">
        <Queue
          href="/admin/investors?status=uploaded_kyc"
          label="Investors to verify"
          count={counts.awaitingVerification}
          hint="Check documents, enter NID numbers and approve"
        />
        <Queue
          href="/admin/payments?status=pending"
          label="Payments to confirm"
          count={counts.pendingPayments}
          hint="Check the money arrived, then confirm"
        />
        <Queue
          href="/admin/investments?status=pending"
          label="Investments to activate"
          count={counts.pendingInvestments}
          hint="Activate once the payment is confirmed"
        />
        <Queue
          href="/admin/payments?status=overdue"
          label="Overdue payments"
          count={counts.overduePayments}
          hint="Follow up with the investor"
        />
        <Queue
          href="/admin/change-requests?status=PENDING"
          label="Profile changes to review"
          count={counts.pendingChanges}
          hint="Approve or reject requested changes"
        />
      </Section>

      <Section title="Payouts">
        <Queue
          href="/admin/payouts/items?batch=none"
          label="Payout items not in a batch"
          count={items.count}
          detail={
            items.count > 0
              ? `${formatTaka(items.amount)}${items.complete ? '' : ' or more (too many to count)'}`
              : undefined
          }
          hint="Add them to a CBL or BEFTN batch in an open window"
        />
        <Queue
          href="/admin/payouts/batches?status=draft"
          label="Batches not sent to the bank"
          count={counts.draftBatches}
          hint="Download the bank file and mark the batch as sent"
        />
        <Queue
          href="/admin/payouts/batches?status=exported"
          label="Batches to confirm as paid"
          count={counts.sentBatches}
          hint="Confirm once the bank has paid"
        />
        <Queue
          href="/admin/payouts?status=overdue"
          label="Windows past their last day"
          count={counts.overdueWindows}
          hint="Still open after the last payout day: check nothing is left unpaid"
        />
      </Section>

      <Section title="Referrals">
        <Queue
          href="/admin/referrals?bonus=unrecorded"
          label="Bonuses to record"
          count={counts.unrecordedBonuses}
          hint="Decide the referrer’s bonus and record it"
        />
      </Section>
    </>
  );
}
