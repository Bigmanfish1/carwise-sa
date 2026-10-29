import type { Metadata } from 'next';
import { PHASES } from '../phases';

export const metadata: Metadata = { title: 'Ownership phases | Carwise SA' };

export default function PhasesPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">The five phases of owning a car</h1>
      <ol className="space-y-4">
        {PHASES.map((phase, index) => (
          <li key={phase.slug} className="rounded-lg border border-slate-200 p-5">
            <h2 className="text-xl font-semibold">
              {index + 1}. {phase.name}
            </h2>
            <p className="mt-1 text-slate-600">{phase.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
