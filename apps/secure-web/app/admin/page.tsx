import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/ui';
import { getQueueCounts, requireStaff } from '@/lib/admin';

function Queue({ href, label, count, hint }: { href: string; label: string; count: number; hint: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-hairline bg-white p-5 drop-shadow-[0px_4px_12px_rgba(0,0,0,0.03)] hover:border-black"
    >
      <p className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{label}</p>
      <p className="text-2xl leading-8 font-bold tracking-[-0.6px] text-ink tabular-nums">{count}</p>
      <p className="text-xs leading-4 text-muted">{count === 0 ? 'Nothing waiting' : hint}</p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  await requireStaff('/admin');
  const counts = await getQueueCounts('/admin');

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" description="Work waiting for the team. Open a card to see the list." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </>
  );
}
