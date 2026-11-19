import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/session';

// The signed-in home: investors go to their dashboard (which sends them to
// verification until they have a profile), staff to the admin panel.
export default async function Home() {
  const user = await requireSessionUser('/');
  redirect(user.role === 'INVESTOR' ? '/dashboard' : '/admin');
}
