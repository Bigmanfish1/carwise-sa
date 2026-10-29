'use client';

import {
  compareBalloon,
  financeInputSchema,
  formatZar,
  randsToCents,
  type FinanceInput,
} from '@carwise/core';
import { useMemo, useState } from 'react';
import { ErrorList, Field, Stat } from '@/components/ui';
import { BalanceChart } from './balance-chart';

interface FormState {
  price: string;
  deposit: string;
  tradeIn: string;
  ratePercent: string;
  termMonths: string;
  balloonPercent: string;
  initiationFee: string;
  initiationFeeFinanced: boolean;
  monthlyServiceFee: string;
}

const INITIAL: FormState = {
  price: '300000',
  deposit: '30000',
  tradeIn: '0',
  ratePercent: '11.5',
  termMonths: '72',
  balloonPercent: '0',
  initiationFee: '0',
  initiationFeeFinanced: false,
  monthlyServiceFee: '0',
};

const num = (value: string): number => (value.trim() === '' ? 0 : Number(value));

function toInput(form: FormState): FinanceInput {
  return {
    price: randsToCents(num(form.price)),
    deposit: randsToCents(num(form.deposit)),
    tradeIn: randsToCents(num(form.tradeIn)),
    annualRate: num(form.ratePercent) / 100,
    termMonths: num(form.termMonths),
    balloonPercent: num(form.balloonPercent) / 100,
    initiationFee: randsToCents(num(form.initiationFee)),
    initiationFeeFinanced: form.initiationFeeFinanced,
    monthlyServiceFee: randsToCents(num(form.monthlyServiceFee)),
  };
}

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

export function FinanceCalculator() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const outcome = useMemo(() => {
    const input = toInput(form);
    const parsed = financeInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.issues.map((issue) => issue.message) };
    }
    return { ok: true as const, comparison: compareBalloon(input) };
  }, [form]);

  const hasBalloon = num(form.balloonPercent) > 0;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Finance inputs">
        <Field label="Vehicle price" suffix="R" value={form.price} onChange={set('price')} />
        <Field label="Deposit" suffix="R" value={form.deposit} onChange={set('deposit')} />
        <Field label="Trade-in value" suffix="R" value={form.tradeIn} onChange={set('tradeIn')} />
        <Field
          label="Interest rate (per year)"
          suffix="%"
          value={form.ratePercent}
          onChange={set('ratePercent')}
        />
        <Field
          label="Term"
          suffix="months"
          step="1"
          value={form.termMonths}
          onChange={set('termMonths')}
        />
        <Field
          label="Balloon payment (share of price)"
          suffix="%"
          value={form.balloonPercent}
          onChange={set('balloonPercent')}
        />
        <Field
          label="Initiation fee"
          suffix="R"
          value={form.initiationFee}
          onChange={set('initiationFee')}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.initiationFeeFinanced}
            onChange={(e) => set('initiationFeeFinanced')(e.target.checked)}
          />
          Add the initiation fee to the loan (otherwise it is paid upfront)
        </label>
        <Field
          label="Monthly service fee"
          suffix="R / month"
          value={form.monthlyServiceFee}
          onChange={set('monthlyServiceFee')}
        />
      </form>

      <div className="space-y-8" aria-live="polite">
        {!outcome.ok ? (
          <ErrorList errors={outcome.errors} />
        ) : (
          <Results comparison={outcome.comparison} hasBalloon={hasBalloon} />
        )}
      </div>
    </div>
  );
}

function Results({
  comparison,
  hasBalloon,
}: {
  comparison: ReturnType<typeof compareBalloon>;
  hasBalloon: boolean;
}) {
  const result = comparison.withBalloon;
  return (
    <>
      <div className="rounded-lg border border-slate-200 p-5">
        <dl className="grid grid-cols-2 gap-4">
          <Stat label="Monthly payment" value={formatZar(result.monthlyPayment)} strong />
          <Stat label="Amount financed" value={formatZar(result.principal)} />
          <Stat label="Total interest" value={formatZar(result.totalInterest)} />
          <Stat label="Total cost of credit" value={formatZar(result.totalCostOfCredit)} />
          <Stat label="Total paid" value={formatZar(result.totalPaid)} />
          <Stat label="Effective annual cost" value={percent(result.effectiveAnnualRate)} />
          {hasBalloon ? (
            <Stat label="Balloon due at the end" value={formatZar(result.balloonAmount)} />
          ) : null}
          <Stat label="Paid upfront" value={formatZar(result.upfrontCosts)} />
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Effective annual cost includes the initiation and service fees, so it is higher than the
          quoted rate. Monthly payment includes the service fee.
        </p>
      </div>

      {hasBalloon ? (
        <div className="rounded-lg border border-slate-200 p-5">
          <h2 className="text-lg font-semibold">With vs without the balloon</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 font-medium"></th>
                <th className="py-1 text-right font-medium">With balloon</th>
                <th className="py-1 text-right font-medium">No balloon</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="py-1 text-left font-normal">Monthly payment</th>
                <td className="text-right">{formatZar(comparison.withBalloon.monthlyPayment)}</td>
                <td className="text-right">
                  {formatZar(comparison.withoutBalloon.monthlyPayment)}
                </td>
              </tr>
              <tr>
                <th className="py-1 text-left font-normal">Total interest</th>
                <td className="text-right">{formatZar(comparison.withBalloon.totalInterest)}</td>
                <td className="text-right">{formatZar(comparison.withoutBalloon.totalInterest)}</td>
              </tr>
              <tr>
                <th className="py-1 text-left font-normal">Total paid</th>
                <td className="text-right">{formatZar(comparison.withBalloon.totalPaid)}</td>
                <td className="text-right">{formatZar(comparison.withoutBalloon.totalPaid)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-slate-600">
            The balloon lowers your monthly payment by {formatZar(comparison.monthlySaving)}, but
            costs {formatZar(comparison.extraCostOfBalloon)} more over the term, and you must pay{' '}
            {formatZar(result.balloonAmount)} (or refinance it) at the end.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Enter a balloon percentage to compare the same car with and without one.
        </p>
      )}

      <BalanceChart schedule={result.schedule} principal={result.principal} />

      <details className="rounded-lg border border-slate-200 p-5">
        <summary className="cursor-pointer font-semibold">Amortisation schedule</summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr>
                <th className="py-1 text-left font-medium">Month</th>
                <th className="py-1 font-medium">Opening</th>
                <th className="py-1 font-medium">Interest</th>
                <th className="py-1 font-medium">Capital</th>
                <th className="py-1 font-medium">Closing</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((row) => (
                <tr key={row.month} className="border-t border-slate-100">
                  <td className="py-1 text-left">{row.month}</td>
                  <td>{formatZar(row.openingBalance)}</td>
                  <td>{formatZar(row.interest)}</td>
                  <td>{formatZar(row.capital)}</td>
                  <td>{formatZar(row.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
