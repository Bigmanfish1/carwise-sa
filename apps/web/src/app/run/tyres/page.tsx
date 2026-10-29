import type { Metadata } from 'next';
import { CalculatorLayout } from '@/components/ui';
import { TyreEstimator } from './tyre-estimator';

export const metadata: Metadata = { title: 'Tyre replacement estimator | Carwise SA' };

export default function TyresPage() {
  return (
    <CalculatorLayout
      title="Tyre replacement estimator"
      intro="Estimate when your tyres need replacing and what they cost you per kilometre and per month."
    >
      <TyreEstimator />
    </CalculatorLayout>
  );
}
