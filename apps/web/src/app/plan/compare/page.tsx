import type { Metadata } from 'next';
import { CalculatorLayout } from '@/components/ui';
import { CarComparison } from './car-comparison';

export const metadata: Metadata = { title: 'Compare the cost of up to 3 cars | Carwise SA' };

export default function ComparePage() {
  return (
    <CalculatorLayout
      title="Compare the total cost of up to 3 cars"
      intro="A cheaper sticker price is not always a cheaper car. Enter the details for each car to see what it costs to own over the years you keep it."
    >
      <CarComparison />
    </CalculatorLayout>
  );
}
