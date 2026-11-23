import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ActionButton } from '@/components/admin/action-button';
import { PROJECT_STATUS, StatusBadge } from '@/components/admin/labels';
import { secondaryButtonClass } from '@/components/dashboard/form';
import { Badge, Card, EmptyState, Notice, PageHeader } from '@/components/dashboard/ui';
import {
  acceptingNow,
  canManage,
  countProjectInvestments,
  getProject,
  listMonthlyRates,
  requireStaff,
  type AdminProject,
  type ProjectStatus,
} from '@/lib/admin';
import { formatDate, formatRate, formatTaka } from '@/lib/format';
import { HistoryLink } from '../../audit/ui';
import { SetRateForm } from '../../rates/rate-forms';
import { RatesTable } from '../../rates/rates-table';

export const metadata: Metadata = {
  title: 'Project · HoneyComb Admin',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Status changes offered from each status. The API refuses moving a project
// with active investments to Draft, Paused, Completed or Cancelled, and
// shows that message here.
const NEXT_STATUS: Record<ProjectStatus, { to: ProjectStatus; label: string; confirm: string }[]> = {
  DRAFT: [
    { to: 'OPEN', label: 'Open for investment', confirm: 'Investors will be able to apply from the start date.' },
    { to: 'CANCELLED', label: 'Cancel project', confirm: 'The project won’t be offered.' },
  ],
  OPEN: [
    { to: 'FULL', label: 'Mark as full', confirm: 'No new investments will be accepted.' },
    { to: 'PAUSED', label: 'Pause', confirm: 'No new investments until it’s reopened.' },
    { to: 'COMPLETED', label: 'Mark completed', confirm: 'The project will be closed for good.' },
  ],
  PAUSED: [
    { to: 'OPEN', label: 'Reopen', confirm: 'Investors can apply again.' },
    { to: 'COMPLETED', label: 'Mark completed', confirm: 'The project will be closed for good.' },
    { to: 'CANCELLED', label: 'Cancel project', confirm: 'The project will be closed for good.' },
  ],
  FULL: [
    { to: 'OPEN', label: 'Reopen', confirm: 'Investors can apply again.' },
    { to: 'COMPLETED', label: 'Mark completed', confirm: 'The project will be closed for good.' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-3">
      {items.map(([term, value]) => (
        <div key={term} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{term}</dt>
          <dd className="text-sm leading-5 break-words text-ink">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

// Why an OPEN project still isn't taking money, in the order the API checks.
function notAcceptingReason(p: AdminProject) {
  if (!p.isActive) return 'it’s inactive';
  if (!p.isVisible) return 'it’s hidden';
  if (new Date(p.startDate).getTime() > Date.now()) return `it starts on ${formatDate(p.startDate)}`;
  if (p.endDate && new Date(p.endDate).getTime() < Date.now()) return `it ended on ${formatDate(p.endDate)}`;
  return null;
}

export default async function AdminProjectPage(props: PageProps<'/admin/projects/[id]'>) {
  const { id } = await props.params;
  const returnTo = `/admin/projects/${id}`;
  const user = await requireStaff(returnTo);
  if (!UUID_RE.test(id)) notFound();

  const project = await getProject(id, returnTo);
  if (!project) notFound();

  const [rates, investmentCount] = await Promise.all([
    listMonthlyRates(
      new URLSearchParams({ projectId: id, limit: '100', sortBy: 'periodMonth', sortOrder: 'desc' }),
      returnTo,
    ),
    countProjectInvestments(id, returnTo),
  ]);

  const manage = canManage(user.role);
  const endpoint = `/api/admin/project/${id}`;
  const accepting = acceptingNow(project);
  const reason = project.status === 'OPEN' && !accepting ? notAcceptingReason(project) : null;

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <>
            <StatusBadge labels={PROJECT_STATUS} status={project.status} />
            {accepting ? <Badge tone="solid">Taking investments</Badge> : <Badge tone="outline">Not taking investments</Badge>}
            {manage && (
              <Link href={`${returnTo}/edit`} className={secondaryButtonClass}>
                Edit details
              </Link>
            )}
            <HistoryLink role={user.role} targetId={project.id} />
          </>
        }
      />

      {reason && (
        <Notice title="Open, but not taking investments">
          Investors can’t apply because {reason}.
        </Notice>
      )}
      {project.projectRate == null && (
        <Notice title="No fixed rate">
          Fixed-rate investments in this project are recorded at 0%. Investors can still choose a variable rate,
          which is paid at the monthly rate set below.
        </Notice>
      )}

      <Card title="Details">
        <Details
          items={[
            ['Minimum investment', formatTaka(project.minimumInvestment)],
            ['Maximum investment', project.maximumInvestment ? formatTaka(project.maximumInvestment) : 'No limit'],
            ['Target', project.targetAmount ? formatTaka(project.targetAmount) : 'No target'],
            ['Raised so far', formatTaka(project.totalInvestedAmount)],
            ['Currently active', formatTaka(project.totalActiveInvestmentAmout)],
            ['Fixed monthly rate', project.projectRate != null ? formatRate(project.projectRate) : 'Not set'],
            ['Starts', formatDate(project.startDate)],
            ['Ends', project.endDate ? formatDate(project.endDate) : 'No end date'],
            ['Investments', String(investmentCount)],
            ['Visible to investors', project.isVisible ? 'Yes' : 'No'],
            ['Active', project.isActive ? 'Yes' : 'No'],
            ['Created', formatDate(project.createdAt)],
          ]}
        />
      </Card>

      {manage && (
        <Card title="Manage" description="Only an open project takes new applications and investments.">
          <div className="flex flex-col gap-5 p-5">
            {NEXT_STATUS[project.status].length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {NEXT_STATUS[project.status].map((s, i) => (
                  <ActionButton
                    key={s.to}
                    endpoint={endpoint}
                    body={{ status: s.to }}
                    label={s.label}
                    confirm={s.confirm}
                    variant={i === 0 ? 'primary' : 'secondary'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-5 text-muted">This project is closed. Its status can’t change any more.</p>
            )}

            <div className="flex flex-wrap gap-3 border-t border-hairline pt-5">
              <ActionButton
                endpoint={endpoint}
                body={{ isVisible: !project.isVisible }}
                label={project.isVisible ? 'Hide from investors' : 'Show to investors'}
                variant="secondary"
              />
              <ActionButton
                endpoint={endpoint}
                body={{ isActive: !project.isActive }}
                label={project.isActive ? 'Make inactive' : 'Make active'}
                variant="secondary"
              />
            </div>

            {investmentCount === 0 && (
              <div className="flex flex-col gap-2 border-t border-hairline pt-5">
                <p className="text-sm leading-5 text-muted">
                  No one has invested in this project, so it can still be deleted.
                </p>
                <div className="self-start">
                  <ActionButton
                    endpoint={endpoint}
                    body={{}}
                    method="DELETE"
                    label="Delete project"
                    pendingLabel="Deleting…"
                    confirm="This can’t be undone."
                    variant="secondary"
                    redirectTo="/admin/projects"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card
        title="Monthly rates"
        description="What this project’s variable-rate investments earn each month. The monthly profit run skips the project if the month has no rate."
      >
        {rates.data.length === 0 ? (
          <EmptyState title="No monthly rates yet" body="Set a rate for each month variable-rate investments run." />
        ) : (
          <RatesTable rates={rates.data} showProject={false} manage={manage} />
        )}
        {manage && (
          <div className="border-t border-hairline p-5">
            <h3 className="pb-4 text-sm leading-5 font-semibold text-ink">Set a monthly rate</h3>
            <SetRateForm projects={[{ id: project.id, name: project.name }]} fixedProjectId={project.id} />
          </div>
        )}
      </Card>
    </>
  );
}
