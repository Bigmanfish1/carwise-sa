'use client';

import {
  PROVINCES,
  PROVINCE_NAMES,
  estimateLicenceFee,
  formatZar,
  licenceFees,
  licenceInputSchema,
  type Province,
} from '@carwise/core';
import { useMemo, useState } from 'react';
import { DataSource, ErrorList, Field, SelectField, Stat } from '@/components/ui';

export function LicenceCalculator() {
  const [province, setProvince] = useState<Province>('GP');
  const [tare, setTare] = useState('1250');

  const outcome = useMemo(() => {
    const input = { province, tareKg: Number(tare) };
    const parsed = licenceInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.issues.map((i) => i.message) };
    }
    return { ok: true as const, result: estimateLicenceFee(licenceFees, input) };
  }, [province, tare]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Licence inputs">
        <SelectField
          label="Province"
          value={province}
          onChange={(v) => setProvince(v as Province)}
          options={PROVINCES.map((code) => ({ value: code, label: PROVINCE_NAMES[code] }))}
        />
        <Field
          label="Tare mass (on your licence disc)"
          suffix="kg"
          step="1"
          value={tare}
          onChange={setTare}
        />
        <DataSource data={licenceFees} />
      </form>
      <div aria-live="polite">
        {outcome.ok ? (
          <dl className="rounded-lg border border-slate-200 p-5">
            <Stat
              label="Estimated annual renewal fee"
              value={formatZar(outcome.result.fee)}
              strong
            />
            <p className="mt-3 text-sm text-slate-600">
              {outcome.result.bandMaxTareKg === null
                ? 'Top tare mass band.'
                : `Band: up to ${outcome.result.bandMaxTareKg} kg.`}{' '}
              Penalties for late renewal are not included.
            </p>
          </dl>
        ) : (
          <ErrorList errors={outcome.errors} />
        )}
      </div>
    </div>
  );
}
