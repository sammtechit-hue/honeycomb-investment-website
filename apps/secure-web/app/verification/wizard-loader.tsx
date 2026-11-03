'use client';

import dynamic from 'next/dynamic';

// The wizard restores its draft from sessionStorage, which doesn't exist on
// the server — rendering it client-only avoids a hydration mismatch.
export const WizardLoader = dynamic(() => import('./verification-wizard'), {
  ssr: false,
  loading: () => <div className="min-h-[60vh] w-full" aria-busy />,
});
