import { HeroSection } from '@/components/hero-section';
import { FeatureCard } from '@/components/feature-card';

const features = [
  {
    title: 'Transparent tracking',
    description: 'Every investment and profit calculation is visible to the investor who made it.',
  },
  {
    title: 'Fixed or flexible plans',
    description: 'Choose a fixed-rate return or a flexible plan tied to project performance.',
  },
  {
    title: 'Verified projects only',
    description: 'Every project listed here has gone through document and compliance review.',
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-6">
      <HeroSection
        eyebrow="Investment Platform"
        title="Invest with clarity"
        description="Placeholder copy — this page is a structural example, not final marketing content."
      />
      <section className="grid gap-4 pb-20 sm:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </section>
    </div>
  );
}
