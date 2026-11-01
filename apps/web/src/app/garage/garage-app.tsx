'use client';

import {
  computeReminders,
  exportGarage,
  importGarage,
  setCar,
  type Garage,
  type Reminder,
  type ReminderStatus,
} from '@carwise/core';
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { CarForm } from './car-form';
import { LogSection } from './log-section';
import { useGarage } from './use-garage';

const STATUS_STYLE: Record<ReminderStatus, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-900' },
  soon: { label: 'Due soon', className: 'bg-amber-100 text-amber-900' },
  ok: { label: 'OK', className: 'bg-green-100 text-green-900' },
  unknown: { label: 'Needs info', className: 'bg-slate-100 text-slate-700' },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const style = STATUS_STYLE[reminder.status];
  return (
    <li className="flex flex-wrap items-center gap-3">
      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${style.className}`}>
        {style.label}
      </span>
      <span className="font-medium">{reminder.label}</span>
      <span className="text-sm text-slate-600">{reminder.detail}</span>
    </li>
  );
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DataSection({
  garage,
  onReplace,
  onClear,
}: {
  garage: Garage;
  onReplace: (garage: Garage) => void;
  onClear: () => void;
}) {
  const [pending, setPending] = useState<Garage | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = importGarage(await file.text());
    if (result.ok) {
      setPending(result.garage);
      setImportError(null);
    } else {
      setPending(null);
      setImportError(result.error);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          onClick={() => download('carwise-garage.json', exportGarage(garage))}
        >
          Export my data
        </button>
        <p className="mt-1 text-sm text-slate-500">
          Saves a file to your device. Keep it as a backup, or use it to move to another browser.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium">
          Import a backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={pick}
            className="mt-1 block text-sm font-normal"
          />
        </label>
        {importError ? (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {importError}
          </p>
        ) : null}
        {pending ? (
          <div className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              This backup has {pending.car ? `the car "${pending.car.name}" and ` : 'no car and '}
              {pending.entries.length} log entries. Importing replaces what is saved here now.
            </p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white"
                onClick={() => {
                  onReplace(pending);
                  setPending(null);
                }}
              >
                Replace my data
              </button>
              <button type="button" className="underline" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        {confirmClear ? (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-900">
            <p>
              This permanently deletes your car and your whole log from this browser. Export first
              if you want a copy.
            </p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
              >
                Yes, delete everything
              </button>
              <button type="button" className="underline" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
            onClick={() => setConfirmClear(true)}
          >
            Delete all my data
          </button>
        )}
      </div>
    </div>
  );
}

export function GarageApp() {
  const store = useGarage();
  const { garage } = store;
  // Today is read after mount so the static page and the first client render match.
  const [today, setToday] = useState('');
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);

  const reminders = useMemo(() => (today ? computeReminders(garage, today) : []), [garage, today]);

  if (!store.loaded) return <p className="text-slate-500">Loading your garage...</p>;

  return (
    <div className="space-y-6">
      <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-700">
        Your garage is saved only in this browser, on this device. There are no accounts and nothing
        is sent to a server. Clearing your browser data erases it, so export a backup now and then.
        Reminders show when you open this page. The app cannot send you notifications.
      </p>
      {store.loadError ? (
        <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-900">
          Your saved garage could not be read ({store.loadError}) and has been left untouched.
          Changes will not be saved until you import a backup or delete all data below.
        </p>
      ) : null}
      {store.saveError ? (
        <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-900">
          {store.saveError}
        </p>
      ) : null}

      <Section title="My car">
        <CarForm
          key={garage.car?.name ?? 'new'}
          car={garage.car}
          onSave={(car) => store.update((g) => setCar(g, car))}
        />
      </Section>

      <Section title="Reminders">
        {!garage.car ? (
          <p className="text-sm text-slate-500">Save your car with its dates to see reminders.</p>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add a licence disc expiry, service plan end or service interval to see reminders.
          </p>
        ) : (
          <ul className="space-y-3">
            {reminders.map((reminder) => (
              <ReminderRow key={reminder.id} reminder={reminder} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Service, parts and repairs log">
        <LogSection garage={garage} today={today} onChange={store.update} />
      </Section>

      <Section title="My data">
        <DataSection garage={garage} onReplace={store.replace} onClear={store.clear} />
      </Section>
    </div>
  );
}
