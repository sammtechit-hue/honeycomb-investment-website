import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FormCard } from '@/components/dashboard/form';
import { PageHeader } from '@/components/dashboard/ui';
import { canManage, requireStaff } from '@/lib/admin';
import { ProjectForm } from '../project-form';

export const metadata: Metadata = {
  title: 'New project · HoneyComb Admin',
};

export default async function NewProjectPage() {
  const user = await requireStaff('/admin/projects/new');
  if (!canManage(user.role)) redirect('/admin/projects');

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="New project"
        description="Investors see the name, description and minimum when they apply."
      />
      <FormCard title="Project details">
        <ProjectForm />
      </FormCard>
    </>
  );
}
