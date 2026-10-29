'use client';

import { planNextService, serviceInputSchema } from '@carwise/core';
import { useEffect, useMemo, useState } from 'react';
import { ErrorList, Field, Stat } from '@/components/ui';

const optional = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);

export function ServicePlanner() {
  // Today's date is read after mount so the static page and the first client render match.
  const [today, setToday] = useState('');
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);
  const [currentKm, setCurrentKm] = useState('45000');
  const [lastServiceKm, setLastServiceKm] = useState('37000');
  const [lastServiceDate, setLastServiceDate] = useState('');
  const [intervalKm, setIntervalKm] = useState('15000');
  const [intervalMonths, setIntervalMonths] = useState('12');
  const [avgKm, setAvgKm] = useState('1200');

  const outcome = useMemo(() => {
    if (!today) return { ok: false as const, errors: [] as string[] };
    const input = {
      currentKm: Number(currentKm),
      lastServiceKm: Number(lastServiceKm),
      lastServiceDate: lastServiceDate || today,
      intervalKm: optional(intervalKm),
      intervalMonths: optional(intervalMonths),
      avgKmPerMonth: Number(avgKm),
      today,
    };
    const parsed = serviceInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.issues.map((i) => i.message) };
    }
    return { ok: true as const, result: planNextService(input) };
  }, [currentKm, lastServiceKm, lastServiceDate, intervalKm, intervalMonths, avgKm, today]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Service inputs">
        <Field
          label="Current odometer"
          suffix="km"
          step="1"
          value={currentKm}
          onChange={setCurrentKm}
        />
        <Field
          label="Odometer at last service"
          suffix="km"
          step="1"
          value={lastServiceKm}
          onChange={setLastServiceKm}
        />
        <Field
          label="Date of last service"
          type="date"
          value={lastServiceDate}
          onChange={setLastServiceDate}
        />
        <Field
          label="Service interval (distance), leave blank if none"
          suffix="km"
          step="1"
          value={intervalKm}
          onChange={setIntervalKm}
        />
        <Field
          label="Service interval (time), leave blank if none"
          suffix="months"
          step="1"
          value={intervalMonths}
          onChange={setIntervalMonths}
        />
        <Field label="Average distance per month" suffix="km" value={avgKm} onChange={setAvgKm} />
        <p className="text-sm text-slate-500">
          Check your service book or service plan for the intervals that apply to your car.
        </p>
      </form>
      <div aria-live="polite">
        {outcome.ok ? (
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-5">
            <div className="col-span-2">
              <Stat
                label="Next service"
                value={
                  outcome.result.overdue
                    ? 'Overdue'
                    : outcome.result.nextDueDate
                      ? `${outcome.result.nextDueDate} (in ${outcome.result.daysRemaining} days)`
                      : 'Cannot predict without distance driven'
                }
                strong
              />
            </div>
            {outcome.result.nextDueKm !== null ? (
              <Stat
                label="Due at odometer"
                value={`${outcome.result.nextDueKm.toLocaleString('en-ZA')} km`}
              />
            ) : null}
            {outcome.result.kmRemaining !== null ? (
              <Stat
                label="Distance remaining"
                value={`${outcome.result.kmRemaining.toLocaleString('en-ZA')} km`}
              />
            ) : null}
            {outcome.result.dueDateByKm ? (
              <Stat label="Date by distance" value={outcome.result.dueDateByKm} />
            ) : null}
            {outcome.result.dueDateByMonths ? (
              <Stat label="Date by time" value={outcome.result.dueDateByMonths} />
            ) : null}
            {outcome.result.dueBy ? (
              <Stat
                label="Comes first"
                value={outcome.result.dueBy === 'km' ? 'Distance' : 'Time'}
              />
            ) : null}
          </dl>
        ) : outcome.errors.length > 0 ? (
          <ErrorList errors={outcome.errors} />
        ) : null}
      </div>
    </div>
  );
}
