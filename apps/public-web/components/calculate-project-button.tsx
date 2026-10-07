'use client';

import type { PayoutFrequency } from '@/lib/roi';
import type { PublicProject } from '@/lib/projects';
import { ROI_PREFILL_EVENT, type RoiPrefill } from './roi-calculator';

const CALCULATOR_FREQUENCIES: PayoutFrequency[] = ['monthly', 'quarterly', 'yearly'];

// Loads this project's terms into the hero calculator and scrolls to it.
export function CalculateProjectButton({
  project,
  label,
}: {
  project: PublicProject;
  label: string;
}) {
  const frequency =
    project.payoutFrequencies.find((period): period is PayoutFrequency =>
      CALCULATOR_FREQUENCIES.includes(period as PayoutFrequency),
    ) ?? 'monthly';

  const prefill: RoiPrefill = {
    amount: project.minimumInvestment,
    investmentType: project.investmentType,
    frequency,
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
