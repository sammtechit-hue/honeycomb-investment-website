import type { Metadata } from 'next';
import { FormCard } from '@/components/dashboard/form';
import { EmptyState, Notice, PageHeader } from '@/components/dashboard/ui';
import { getInvestments, getOpenProjects, requireInvestor } from '@/lib/investor';
import { InvestForm } from './invest-form';

export const metadata: Metadata = {
  title: 'Invest · HoneyComb Investor',
};

// New investment, or a top-up when ?project= names a project the investor
// already holds. A top-up is just another investment record with its own
// date, so both use the same form and endpoint.
export default async function InvestPage(props: PageProps<'/dashboard/invest'>) {
  const { profile } = await requireInvestor('/dashboard/invest');
  const [projects, investments, query] = await Promise.all([
    getOpenProjects('/dashboard/invest'),
    getInvestments('/dashboard/invest'),
    props.searchParams,
  ]);

  const requested = typeof query.project === 'string' ? query.project : undefined;
  const preselected = projects.find((p) => p.id === requested);
  const isTopUp = !!preselected && investments.some((i) => i.projectId === preselected.id && i.status === 'active');

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title={isTopUp ? `Top up ${preselected.name}` : 'Invest in a project'}
        description={
          isTopUp
            ? 'A top-up is recorded as its own investment with its own date, so its profit is calculated separately.'
            : 'Choose a project and the amount you want to invest. HoneyComb reviews every request before it becomes active.'
        }
      />

      {profile.status !== 'active' ? (
        <Notice title="Your account isn’t verified yet">
          You can invest once our team has verified your details and documents.
        </Notice>
      ) : projects.length === 0 ? (
        <FormCard title="No projects are open right now">
          <EmptyState
            title="Nothing to invest in yet"
            body="When HoneyComb opens a new project for investment, it will appear here."
          />
        </FormCard>
      ) : (
        <FormCard title="Investment details">
          {requested && !preselected && (
            <Notice title="That project isn’t open for investment">Choose another project below.</Notice>
          )}
          <InvestForm projects={projects} initialProjectId={preselected?.id} />
        </FormCard>
      )}
    </>
  );
}
