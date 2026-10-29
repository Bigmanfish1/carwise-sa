'use client';

import { estimateTyreReplacement, formatZar, randsToCents, tyreInputSchema } from '@carwise/core';
import { useMemo, useState } from 'react';
import { ErrorList, Field, Stat } from '@/components/ui';

const num = (value: string): number => (value.trim() === '' ? 0 : Number(value));

export function TyreEstimator() {
  const [life, setLife] = useState('40000');
  const [kmPerMonth, setKmPerMonth] = useState('1200');
  const [used, setUsed] = useState('15000');
  const [price, setPrice] = useState('1500');
  const [count, setCount] = useState('4');
  const [fitting, setFitting] = useState('60');
  const [alignment, setAlignment] = useState('0');

  const outcome = useMemo(() => {
    const input = {
      tyreLifeKm: num(life),
      kmPerMonth: num(kmPerMonth),
      kmOnCurrentTyres: num(used),
      pricePerTyre: randsToCents(num(price)),
      tyreCount: num(count),
      fittingPerTyre: randsToCents(num(fitting)),
      alignment: randsToCents(num(alignment)),
    };
    const parsed = tyreInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.issues.map((i) => i.message) };
    }
    return { ok: true as const, result: estimateTyreReplacement(input) };
  }, [life, kmPerMonth, used, price, count, fitting, alignment]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Tyre inputs">
        <Field label="Expected tyre life" suffix="km" step="1" value={life} onChange={setLife} />
        <Field
          label="Distance already on current tyres"
          suffix="km"
          value={used}
          onChange={setUsed}
        />
        <Field label="Distance per month" suffix="km" value={kmPerMonth} onChange={setKmPerMonth} />
        <Field label="Price per tyre" suffix="R" value={price} onChange={setPrice} />
        <Field label="Number of tyres" step="1" value={count} onChange={setCount} />
        <Field
          label="Fitting and balancing per tyre"
          suffix="R"
          value={fitting}
          onChange={setFitting}
        />
        <Field
          label="Wheel alignment (once per set)"
          suffix="R"
          value={alignment}
          onChange={setAlignment}
        />
        <p className="text-sm text-slate-500">
          Tyre life depends on the tyre, your driving and the roads. Use the manufacturer&apos;s
          warranty distance as a starting point.
        </p>
      </form>
      <div aria-live="polite">
        {outcome.ok ? (
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-5">
            <div className="col-span-2">
              <Stat
                label="Replacement due"
                value={
                  outcome.result.due
                    ? 'Now'
                    : outcome.result.monthsRemaining === null
                      ? `in ${outcome.result.kmRemaining.toLocaleString('en-ZA')} km`
                      : `in about ${Math.round(outcome.result.monthsRemaining)} months`
                }
                strong
              />
            </div>
            <Stat label="Cost of a replacement" value={formatZar(outcome.result.replacementCost)} />
            <Stat
              label="Distance remaining"
              value={`${outcome.result.kmRemaining.toLocaleString('en-ZA')} km`}
            />
            <Stat label="Tyre cost per km" value={formatZar(outcome.result.costPerKm)} />
            <Stat label="Tyre cost per month" value={formatZar(outcome.result.costPerMonth)} />
          </dl>
        ) : (
          <ErrorList errors={outcome.errors} />
        )}
      </div>
    </div>
  );
}
