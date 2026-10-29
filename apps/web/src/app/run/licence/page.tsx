import type { Metadata } from 'next';
import { CalculatorLayout } from '@/components/ui';
import { LicenceCalculator } from './licence-calculator';

export const metadata: Metadata = { title: 'Licence disc renewal estimate | Carwise SA' };

export default function LicencePage() {
  return (
    <CalculatorLayout
      title="Licence disc renewal estimate"
      intro="Estimate your annual licence renewal fee from your province and your vehicle's tare mass."
    >
      <LicenceCalculator />
    </CalculatorLayout>
  );
}
