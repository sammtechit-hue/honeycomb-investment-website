type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

export function HeroSection({ eyebrow, title, description }: Props) {
  return (
    <section className="flex flex-col gap-4 py-20 text-center">
      <span className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        {eyebrow}
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mx-auto max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </section>
  );
}
