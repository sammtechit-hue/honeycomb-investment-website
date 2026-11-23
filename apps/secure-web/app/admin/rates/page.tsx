import type { Metadata } from 'next';
import Link from 'next/link';
import { FormCard, inputClass } from '@/components/dashboard/form';
import { Card, EmptyState, PageHeader } from '@/components/dashboard/ui';
import { canManage, listAllProjects, listMonthlyRates, requireStaff } from '@/lib/admin';
import { PAGE_SIZE } from '@/lib/list-query';
import { SetRateForm } from './rate-forms';
import { RatesTable } from './rates-table';

export const metadata: Metadata = {
  title: 'Monthly rates · HoneyComb Admin',
};

const PATH = '/admin/rates';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Every project's monthly rates in one place, plus setting one month's rate
// for several projects at once.
export default async function AdminRatesPage(props: PageProps<'/admin/rates'>) {
  const user = await requireStaff(PATH);
  const params = await props.searchParams;
  const projectParam = one(params.project) ?? '';
  const projectId = UUID_RE.test(projectParam) ? projectParam : '';
  const rawPage = Number(one(params.page));
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10_000 ? rawPage : 1;

  const api = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sortBy: 'periodMonth',
    sortOrder: 'desc',
  });
  if (projectId) api.set('projectId', projectId);

  const [projects, rates] = await Promise.all([listAllProjects(PATH), listMonthlyRates(api, PATH)]);
  const manage = canManage(user.role);
  const options = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Monthly rates"
        description="Variable-rate investments earn the rate set for their project and month. Fixed-rate investments use the project’s fixed rate instead."
      />

      {manage && (
        <FormCard
          title="Set a rate for a month"
          description="Choose one or more projects. Projects that already have a rate for that month are skipped; change those from the table below."
        >
          <SetRateForm projects={options} />
        </FormCard>
      )}

      <Card>
        <form method="get" action={PATH} className="flex flex-col gap-3 border-b border-hairline px-5 py-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="project" className="text-sm leading-5 text-ink">
              Project
            </label>
            <select id="project" name="project" defaultValue={projectId} className={inputClass}>
              <option value="">All projects</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="flex h-10 items-center justify-center rounded-md border border-emphasis px-4 text-sm leading-5 text-ink hover:bg-surface"
          >
            Show
          </button>
          {projectId && (
            <Link href={PATH} className="flex h-10 items-center text-sm leading-5 text-muted underline">
              Clear
            </Link>
          )}
        </form>

        {rates.data.length === 0 ? (
          <EmptyState
            title="No monthly rates"
            body={projectId ? 'This project has no monthly rates yet.' : 'No monthly rates have been set yet.'}
          />
        ) : (
          <RatesTable rates={rates.data} showProject manage={manage} />
        )}

        <RatesPagination projectId={projectId} page={page} totalPages={rates.meta.totalPages} total={rates.meta.total} />
      </Card>
    </>
  );
}

// The shared Pagination builds ?q=&status= links; this list pages by project.
function RatesPagination({
  projectId,
  page,
  totalPages,
  total,
}: {
  projectId: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  if (total === 0) return null;
  const href = (p: number) => `${PATH}?${new URLSearchParams({ ...(projectId && { project: projectId }), page: String(p) })}`;
  const link = 'text-sm leading-5 text-ink underline decoration-rule underline-offset-2 hover:decoration-black';
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4 border-t border-hairline px-5 py-3">
      <p className="text-xs leading-4 text-muted">
        {total} {total === 1 ? 'rate' : 'rates'} · page {Math.min(page, totalPages)} of {totalPages}
      </p>
      <div className="flex gap-4">
        {page > 1 && (
          <Link href={href(Math.min(page - 1, totalPages))} className={link}>
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link href={href(page + 1)} className={link}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
