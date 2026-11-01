import type { Metadata } from 'next';
import { CalculatorLayout } from '@/components/ui';
import { AffordabilityCheck } from './affordability-check';

export const metadata: Metadata = { title: 'Can I afford this car? | Carwise SA' };

export default function AffordabilityPage() {
  return (
    <CalculatorLayout
      title="Can I afford this car?"
      intro="See what share of your take-home pay a car would use, and how much room you have under your own limit."
    >
      <AffordabilityCheck />
    </CalculatorLayout>
  );
}
