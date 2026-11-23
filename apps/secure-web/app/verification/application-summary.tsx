import Link from 'next/link';
import type { ReactNode } from 'react';
import { safeFilePath } from '@/lib/files';
import { formatDate, formatTaka } from '@/lib/format';
import type { Investment, InvestorProfile } from '@/lib/investor';

// The application as submitted, read-only. Shown while it's under review and
// after a rejection, next to the "Edit and resubmit" action.

const PERIOD_LABEL: Record<Investment['disbursementPeriod'], string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly',
};

export function ApplicationStatus({ profile }: { profile: InvestorProfile }) {
  if (profile.status === 'rejected') {
    return (
      <section
        role="status"
        className="flex flex-col gap-4 rounded-lg border-2 border-emphasis bg-white p-5 sm:p-8"
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs leading-4 tracking-[1.2px] text-muted uppercase">Changes needed</p>
          <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.6px] text-ink">
            Your application was sent back
          </h1>
          <p className="text-sm leading-5 text-secondary">
            Our verification team needs a few changes before they can approve your account.
            {profile.rejectedAt && <> Sent back on {formatDate(profile.rejectedAt)}.</>}
          </p>
        </div>
        {profile.rejectionReason && (
          <blockquote className="rounded-md bg-surface-strong p-4 text-sm leading-5 whitespace-pre-line text-ink">
            {profile.rejectionReason}
          </blockquote>
        )}
        <Link
          href="/verification/edit"
          className="flex h-11 items-center justify-center rounded-md bg-emphasis px-6 text-sm leading-5 text-white hover:bg-black/85 sm:self-start"
        >
          Edit and resubmit
        </Link>
      </section>
    );
  }

  return (
    <section role="status" className="flex flex-col gap-2 rounded-lg border border-hairline bg-white p-5 sm:p-8">
      <p className="text-xs leading-4 tracking-[1.2px] text-muted uppercase">In review</p>
      <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.6px] text-ink">
        Your application is being reviewed
      </h1>
      <p className="text-sm leading-5 text-secondary">
        Our verification team is checking your details, documents and investment. You can&apos;t change them during
        the review. If anything needs fixing, we&apos;ll send it back to you here with a note. Once you&apos;re
        approved, your investor portal opens and you can pay for your investment.
      </p>
    </section>
  );
}

export function ApplicationSummary({
  profile,
  investment,
}: {
  profile: InvestorProfile;
  investment: Investment | null;
}) {
  const bank = profile.bankAccount[0];
  const nominee = profile.nominee;
  const kyc = profile.kycDocuments;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Personal info">
        <Row label="Full name" value={profile.fullname} />
        <Row label="Home address" value={profile.address} />
        <Row label="Profession" value={profile.profession} />
        <Row label="Workplace" value={profile.workplace} />
        <Row label="Email" value={profile.user.email} />
        <Row label="Mobile" value={profile.user.phone} />
      </Section>

      <Section title="Nominee">
        <Row label="Name" value={nominee?.nomineeName} />
        <Row label="Relation" value={nominee?.relation} />
        <Row label="Mobile" value={nominee?.nomineePhone} />
      </Section>

      <Section title="Bank details">
        <Row label="Bank" value={bank?.bankName} />
        <Row label="Branch" value={bank?.branchName} />
        <Row label="Account name" value={bank?.accountName} />
        <Row label="Account number" value={bank?.accountNumber} mono />
        {bank?.routingNumber && <Row label="Routing number" value={bank.routingNumber} mono />}
        <Row label="Account type" value={bank?.accountType ? capitalize(bank.accountType) : null} />
      </Section>

      <Section title="Investment">
        {investment ? (
          <>
            <Row label="Project" value={investment.project.name} />
            <Row label="Amount" value={formatTaka(investment.amount)} mono />
            <Row label="Rate type" value={investment.investmentType === 'fixed' ? 'Fixed rate' : 'Variable rate'} />
            <Row label="Profit payout" value={PERIOD_LABEL[investment.disbursementPeriod]} />
            <Row
              label="Term"
              value={investment.investmentPeriodMonths ? `${investment.investmentPeriodMonths} months` : null}
            />
          </>
        ) : (
          <Row label="Investment" value={null} />
        )}
      </Section>

      <Section title="Documents">
        <DocRow label="Your NID (front)" url={kyc?.nidFront} />
        <DocRow label="Your NID (back)" url={kyc?.nidBack} />
        <DocRow label="Your photograph" url={kyc?.photo} />
        <DocRow label="Nominee's NID (front)" url={nominee?.nomineeNidFront} />
        <DocRow label="Nominee's NID (back)" url={nominee?.nomineeNidBack} />
        <DocRow label="Nominee's photograph" url={nominee?.nomineePhoto} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-hairline bg-white p-5 sm:p-6">
      <h2 className="pb-3 text-sm leading-5 font-semibold text-ink">{title}</h2>
      <dl className="flex flex-col divide-y divide-hairline border-t border-hairline">{children}</dl>
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="grid gap-1 py-2.5 text-sm leading-5 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`break-words text-ink ${mono ? 'tabular-nums' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function DocRow({ label, url }: { label: string; url: string | null | undefined }) {
  const href = safeFilePath(url);
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm leading-5">
      <dt className="text-muted">{label}</dt>
      <dd>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-ink underline">
            View
          </a>
        ) : (
          <span className="text-muted">Missing</span>
        )}
      </dd>
    </div>
  );
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
