'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// POST /api/auth/logout always succeeds at clearing the cookies (see
// AuthController.logout), so the user is sent to sign in either way.
export function SignOutButton({ signInHref }: { signInHref: '/login' | '/staff/login' }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace(signInHref);
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="text-sm leading-5 text-secondary underline decoration-rule underline-offset-2 hover:text-black disabled:opacity-60"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
