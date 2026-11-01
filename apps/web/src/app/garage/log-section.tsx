'use client';

import {
  LOG_KINDS,
  LOG_KIND_LABELS,
  addEntry,
  formatZar,
  logEntrySchema,
  randsToCents,
  removeEntry,
  sortedEntries,
  summariseSpend,
  type Garage,
  type LogKind,
} from '@carwise/core';
import { useState } from 'react';
import { ErrorList, Field, SelectField, Stat } from '@/components/ui';

interface Props {
  garage: Garage;
  today: string;
  onChange: (change: (garage: Garage) => Garage) => void;
}

export function LogSection({ garage, today, onChange }: Props) {
  const [date, setDate] = useState('');
  const [kind, setKind] = useState<LogKind>('service');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () => {
    const entry = {
      id: crypto.randomUUID(),
      date: date || today,
      kind,
      description,
      cost: randsToCents(cost.trim() === '' ? 0 : Number(cost)),
      odometerKm: odometer.trim() === '' ? undefined : Number(odometer),
    };
    const parsed = logEntrySchema.safeParse(entry);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setErrors([]);
    onChange((g) => addEntry(g, entry));
    setDescription('');
    setCost('');
    setOdometer('');
  };

  const entries = sortedEntries(garage);
  const spend = summariseSpend(garage);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        aria-label="Add to the log"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field type="date" label="Date (blank is today)" value={date} onChange={setDate} />
          <SelectField
            label="Type"
            value={kind}
            onChange={(value) => setKind(value as LogKind)}
            options={LOG_KINDS.map((k) => ({ value: k, label: LOG_KIND_LABELS[k] }))}
          />
          <div className="sm:col-span-2">
            <Field
              type="text"
              label="What was done"
              value={description}
              onChange={setDescription}
            />
          </div>
          <Field label="Cost" suffix="R" value={cost} onChange={setCost} />
          <Field
            label="Odometer (optional)"
            suffix="km"
            step="1"
            value={odometer}
            onChange={setOdometer}
          />
        </div>
        {errors.length > 0 ? <ErrorList errors={errors} /> : null}
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Add to the log
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing logged yet. Log each service so reminders can predict the next one.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-5 sm:grid-cols-3">
            <Stat label="Total spent" value={formatZar(spend.total)} strong />
            {LOG_KINDS.filter((k) => spend.byKind[k] > 0).map((k) => (
              <Stat key={k} label={LOG_KIND_LABELS[k]} value={formatZar(spend.byKind[k])} />
            ))}
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Type</th>
                  <th className="py-1 font-medium">What</th>
                  <th className="py-1 text-right font-medium">Km</th>
                  <th className="py-1 text-right font-medium">Cost</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="py-1">{entry.date}</td>
                    <td>{LOG_KIND_LABELS[entry.kind]}</td>
                    <td>{entry.description}</td>
                    <td className="text-right">
                      {entry.odometerKm?.toLocaleString('en-ZA') ?? ''}
                    </td>
                    <td className="text-right">{formatZar(entry.cost)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="text-red-700 underline"
                        aria-label={`Remove ${entry.description}`}
                        onClick={() => onChange((g) => removeEntry(g, entry.id))}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
