import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { FormCard } from '@/components/dashboard/form';
import { PageHeader } from '@/components/dashboard/ui';
import { canManage, getProject, requireStaff } from '@/lib/admin';
import { ProjectForm } from '../../project-form';

export const metadata: Metadata = {
  title: 'Edit project · HoneyComb Admin',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProjectPage(props: PageProps<'/admin/projects/[id]/edit'>) {
  const { id } = await props.params;
  const returnTo = `/admin/projects/${id}/edit`;
  const user = await requireStaff(returnTo);
  if (!UUID_RE.test(id)) notFound();
  if (!canManage(user.role)) redirect(`/admin/projects/${id}`);

  const project = await getProject(id, returnTo);
  if (!project) notFound();

  return (
    <>
      <PageHeader eyebrow="Projects" title={`Edit ${project.name}`} description="Status is changed from the project page." />
      <FormCard title="Project details">
        <ProjectForm project={project} />
      </FormCard>
    </>
  );
}
