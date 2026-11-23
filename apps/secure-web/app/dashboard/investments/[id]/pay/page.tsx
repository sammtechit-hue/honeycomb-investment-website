import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaymentStatusBadge } from '@/components/dashboard/labels';
import { FormCard } from '@/components/dashboard/form';
import { Notice, PageHeader } from '@/components/dashboard/ui';
import { formatDate, formatTaka } from '@/lib/format';
import { getInvestments, requireInvestor } from '@/lib/investor';
import { PaymentForm } from './payment-form';

export const metadata: Metadata = {
  title: 'Submit payment · HoneyComb Investor',
};

export default async function PayPage(props: PageProps<'/dashboard/investments/[id]/pay'>) {
  const { id } = await props.params;
  const returnTo = `/dashboard/investments/${id}/pay`;
  await requireInvestor(returnTo);

  // Looked up in the investor's own (API-scoped) list, so another
  // investor's id is simply not found.
  const investment = (await getInvestments(returnTo)).find((i) => i.id === id);
  if (!investment) notFound();

  const payment = investment.incomingPayments;
  const closed = investment.status === 'rejected' || investment.status === 'closed';

  return (
    <>
      <PageHeader
        eyebrow="Payment"
        title={`Pay for ${investment.project.name}`}
        description={`Investment of ${formatTaka(investment.amount)} requested on ${formatDate(investment.investmentDate)}.`}
      />

      {payment ? (
        <Notice title="Payment already submitted">
          <span className="flex flex-wrap items-center gap-2">
            {formatTaka(payment.amount)} — <PaymentStatusBadge payment={payment} />
          </span>
          <span className="mt-1 block">
            {payment.status === 'confirmed'
              ? `Confirmed on ${formatDate(payment.confirmedAt)}.`
              : 'Our team will confirm it once the money reaches HoneyComb’s account.'}
          </span>
        </Notice>
      ) : closed ? (
        <Notice title="This investment isn’t accepting payment">
          It has been {investment.status}. Contact HoneyComb support if you think this is a mistake.
        </Notice>
      ) : (
        <FormCard
          title="Payment details"
          description="Pay HoneyComb directly, usually by bank transfer, using the account details our team gave you. Then record the payment here with your receipt so we can confirm it."
        >
          <PaymentForm investmentId={investment.id} defaultAmount={investment.amount} />
        </FormCard>
      )}
    </>
  );
}
