import type { Metadata } from 'next';
import { CalculatorLayout } from '@/components/ui';
import { FuelCalculator } from './fuel-calculator';

export const metadata: Metadata = { title: 'Fuel cost calculator | Carwise SA' };

export default function FuelPage() {
  return (
    <CalculatorLayout
      title="Fuel cost calculator"
      intro="Work out what fuel costs you each month, using your own distance and consumption. Everything is calculated in your browser."
    >
      <FuelCalculator />
    </CalculatorLayout>
  );
}
