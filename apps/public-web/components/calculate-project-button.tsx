'use client';

import type { PublicProject } from '@/lib/projects';
import { ROI_PREFILL_EVENT, type RoiPrefill } from './roi-calculator';

// Loads this project's terms into the hero calculator and scrolls to it.
// Payout frequency isn't a project term — the visitor keeps their own choice.
export function CalculateProjectButton({
  project,
  label,
}: {
  project: PublicProject;
  label: string;
}) {
  const prefill: RoiPrefill = {
    amount: project.minimumInvestment,
    investmentType: project.investmentType,
    termMonths: project.termMonths,
  };

  return (
    <a
      href="#calculator"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(ROI_PREFILL_EVENT, { detail: prefill }));
      }}
      className="flex-1 rounded-md border border-zinc-950 px-3 py-2 text-center text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white"
    >
      {label}
    </a>
  );
}
