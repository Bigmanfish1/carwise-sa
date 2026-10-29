import type { Metadata } from 'next';
import { CalculatorLayout } from '@/components/ui';
import { ServicePlanner } from './service-planner';

export const metadata: Metadata = { title: 'Service schedule planner | Carwise SA' };

export default function ServicePage() {
  return (
    <CalculatorLayout
      title="Service schedule planner"
      intro="Predict your next service from the distance and time intervals in your service book, based on how much you actually drive."
    >
      <ServicePlanner />
    </CalculatorLayout>
  );
}
