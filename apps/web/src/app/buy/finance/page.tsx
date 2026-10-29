import type { Metadata } from 'next';
import { FinanceCalculator } from './finance-calculator';

export const metadata: Metadata = { title: 'Vehicle finance calculator | Carwise SA' };

export default function FinancePage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vehicle finance calculator</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          See your monthly payment, the total interest, and what a balloon payment really costs.
          Everything is calculated in your browser and nothing is stored or sent anywhere.
        </p>
      </div>
      <FinanceCalculator />
      <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        These results are estimates, not financial advice. Your bank&apos;s quote will differ
        because of its own fees, rounding and rate. Check the quote before you sign.
      </p>
    </section>
  );
}
