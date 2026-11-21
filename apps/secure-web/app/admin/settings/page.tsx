import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { FormCard } from '@/components/dashboard/form';
import { Card, Notice, PageHeader } from '@/components/dashboard/ui';
import { canManage, getActiveBusinessSettings, requireStaff } from '@/lib/admin';
import { formatDate, formatRate } from '@/lib/format';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = {
  title: 'Profit settings · HoneyComb Admin',
};

const PATH = '/admin/settings';

export default async function AdminSettingsPage() {
  const user = await requireStaff(PATH);
  const settings = await getActiveBusinessSettings(PATH);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Profit settings"
        description="When the monthly profit is calculated and when a new investment starts earning."
      />

      {!settings && (
        <Notice title="Not set up yet">
          The monthly profit run stops with an error until these settings exist.
          {canManage(user.role) ? ' Fill in the form below.' : ' Ask an admin to set them.'}
        </Notice>
      )}

      {canManage(user.role) ? (
        <FormCard
          title="Settings"
          description={settings ? `Last changed ${formatDate(settings.updatedAt)}` : 'The values below are the usual ones.'}
        >
          <SettingsForm settings={settings} />
        </FormCard>
      ) : (
        settings && (
          <Card title="Settings">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-3">
              <Item term="Profit run day">Day {settings.setcycleday ?? '—'} of each month</Item>
              <Item term="Profit starts after">
                {settings.countingStartAfterDays != null ? `${settings.countingStartAfterDays} days` : '—'}
              </Item>
              <Item term="Default fixed rate">{settings.rate != null ? formatRate(settings.rate) : 'Not set'}</Item>
            </dl>
          </Card>
        )
      )}
    </>
  );
}

function Item({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs leading-4 tracking-[0.6px] text-muted uppercase">{term}</dt>
      <dd className="text-sm leading-5 text-ink">{children}</dd>
    </div>
  );
}
