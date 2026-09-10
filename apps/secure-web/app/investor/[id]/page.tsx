import { apiFetch } from '@/lib/api';
import { InvestorProfileForm } from './investor-profile-form';

type Investor = {
  id: string;
  fullName: string;
  email: string | null;
  address: string | null;
  profession: string | null;
  workplace: string | null;
};

export default async function InvestorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch(`/investor/${id}`);

  if (!res.ok) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="mb-4 text-2xl font-semibold">Edit profile</h1>
        <p className="text-sm text-red-600">
          Could not load investor {id} ({res.status}). Make sure the API is
          running and DATABASE_URL points at a real database.
        </p>
      </main>
    );
  }

  const investor: Investor = await res.json();

  // Prisma returns null for empty optional columns; the zod schema (and
  // react-hook-form) expect undefined instead.
  const defaultValues = {
    fullName: investor.fullName,
    email: investor.email ?? undefined,
    address: investor.address ?? undefined,
    profession: investor.profession ?? undefined,
    workplace: investor.workplace ?? undefined,
  };

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit profile</h1>
      <InvestorProfileForm investorId={id} defaultValues={defaultValues} />
    </main>
  );
}
