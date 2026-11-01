'use client';

import {
  DEFAULT_AFFORDABILITY_THRESHOLD,
  affordabilityInputSchema,
  checkAffordability,
  formatZar,
  randsToCents,
} from '@carwise/core';
import { useMemo, useState } from 'react';
import { ErrorList, Field, Stat } from '@/components/ui';

const num = (value: string): number => (value.trim() === '' ? 0 : Number(value));

export function AffordabilityCheck() {
  const [takeHome, setTakeHome] = useState('30000');
  const [carCost, setCarCost] = useState('6000');
  const [thresholdPercent, setThresholdPercent] = useState(
    String(DEFAULT_AFFORDABILITY_THRESHOLD * 100),
  );

  const outcome = useMemo(() => {
    const input = {
      takeHomePay: randsToCents(num(takeHome)),
      monthlyCarCost: randsToCents(num(carCost)),
      threshold: num(thresholdPercent) / 100,
    };
    const parsed = affordabilityInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.issues.map((i) => i.message) };
    }
    return { ok: true as const, result: checkAffordability(input) };
  }, [takeHome, carCost, thresholdPercent]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form
        className="space-y-4"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Affordability inputs"
      >
        <Field
          label="Monthly take-home pay (after tax)"
          suffix="R"
          value={takeHome}
          onChange={setTakeHome}
        />
        <Field label="Monthly cost of the car" suffix="R" value={carCost} onChange={setCarCost} />
        <p className="-mt-2 text-sm text-slate-500">
          Include your loan payment, fuel, insurance, servicing, tyres and licence. The car
          comparison shows this as the monthly cash cost.
        </p>
        <Field
          label="Most you want to spend on the car"
          suffix="% of take-home"
          value={thresholdPercent}
          onChange={setThresholdPercent}
        />
        <p className="-mt-2 text-sm text-slate-500">
          {DEFAULT_AFFORDABILITY_THRESHOLD * 100}% is a common rule of thumb, not an official limit
          and not advice. Set the figure that fits your own budget.
        </p>
      </form>
      <div aria-live="polite">
        {outcome.ok ? (
          <div className="space-y-4 rounded-lg border border-slate-200 p-5">
            <p
              className={`rounded-md p-3 font-semibold ${
                outcome.result.affordable ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
              }`}
            >
              {outcome.result.affordable
                ? 'Within your limit.'
                : 'Over your limit. This car takes more of your pay than you wanted to spend.'}
            </p>
            <dl className="grid grid-cols-2 gap-4">
              <Stat
                label="Car cost as a share of pay"
                value={`${(outcome.result.share * 100).toFixed(1)}%`}
                strong
              />
              <Stat label="Your limit" value={`${(outcome.result.threshold * 100).toFixed(1)}%`} />
              <Stat
                label="Most you can spend each month"
                value={formatZar(outcome.result.maxMonthlyCost)}
              />
              <Stat
                label={outcome.result.headroom >= 0 ? 'Room left' : 'Over by'}
                value={formatZar(Math.abs(outcome.result.headroom))}
              />
            </dl>
          </div>
        ) : (
          <ErrorList errors={outcome.errors} />
        )}
      </div>
    </div>
  );
}
