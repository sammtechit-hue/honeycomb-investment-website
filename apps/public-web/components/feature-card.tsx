type Props = {
  title: string;
  description: string;
};

export function FeatureCard({ title, description }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}
