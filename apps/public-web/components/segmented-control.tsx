'use client';

import { useId } from 'react';

type Option<T extends string | number> = {
  value: T;
  label: string;
  hint?: string;
};

type Props<T extends string | number> = {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Native radios styled as a segmented control, so keyboard and screen-reader
// behaviour come for free (arrow keys move between options).
export function SegmentedControl<T extends string | number>({
  legend,
  options,
  value,
  onChange,
}: Props<T>) {
  const name = useId();

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-700">{legend}</legend>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label
            key={String(option.value)}
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-zinc-300 bg-white px-2 py-2 text-center text-sm text-zinc-800 transition-colors hover:border-zinc-900 has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-950 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-950 has-[:focus-visible]:ring-offset-2"
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="font-medium">{option.label}</span>
            {option.hint && <span className="text-xs opacity-70">{option.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
