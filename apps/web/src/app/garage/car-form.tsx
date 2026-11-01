'use client';

import { carProfileSchema, type CarProfile } from '@carwise/core';
import { useState } from 'react';
import { ErrorList, Field } from '@/components/ui';

interface Props {
  car: CarProfile | null;
  onSave: (car: CarProfile) => void;
}

const text = (value: string | number | undefined): string =>
  value === undefined ? '' : String(value);
const optionalNumber = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);
const optionalText = (value: string): string | undefined =>
  value.trim() === '' ? undefined : value;

export function CarForm({ car, onSave }: Props) {
  const [form, setForm] = useState(() => ({
    name: text(car?.name),
    make: text(car?.make),
    model: text(car?.model),
    year: text(car?.year),
    registration: text(car?.registration),
    odometerKm: text(car?.odometerKm),
    avgKmPerMonth: text(car?.avgKmPerMonth),
    licenceDiscExpiry: text(car?.licenceDiscExpiry),
    servicePlanExpiryDate: text(car?.servicePlanExpiryDate),
    servicePlanExpiryKm: text(car?.servicePlanExpiryKm),
    serviceIntervalKm: text(car?.serviceIntervalKm),
    serviceIntervalMonths: text(car?.serviceIntervalMonths),
  }));
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    const parsed = carProfileSchema.safeParse({
      name: form.name,
      make: optionalText(form.make),
      model: optionalText(form.model),
      year: optionalNumber(form.year),
      registration: optionalText(form.registration),
      odometerKm: Number(form.odometerKm || 0),
      avgKmPerMonth: Number(form.avgKmPerMonth || 0),
      licenceDiscExpiry: optionalText(form.licenceDiscExpiry),
      servicePlanExpiryDate: optionalText(form.servicePlanExpiryDate),
      servicePlanExpiryKm: optionalNumber(form.servicePlanExpiryKm),
      serviceIntervalKm: optionalNumber(form.serviceIntervalKm),
      serviceIntervalMonths: optionalNumber(form.serviceIntervalMonths),
    });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      setSaved(false);
      return;
    }
    setErrors([]);
    onSave(parsed.data);
    setSaved(true);
  };

  return (
    <form
      className="space-y-4"
      aria-label="My car"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          type="text"
          label="Name (for example, My Polo)"
          value={form.name}
          onChange={set('name')}
        />
        <Field
          type="text"
          label="Registration (optional)"
          value={form.registration}
          onChange={set('registration')}
        />
        <Field type="text" label="Make (optional)" value={form.make} onChange={set('make')} />
        <Field type="text" label="Model (optional)" value={form.model} onChange={set('model')} />
        <Field label="Year (optional)" step="1" value={form.year} onChange={set('year')} />
        <Field
          label="Odometer now"
          suffix="km"
          step="1"
          value={form.odometerKm}
          onChange={set('odometerKm')}
        />
        <Field
          label="Average distance per month"
          suffix="km"
          value={form.avgKmPerMonth}
          onChange={set('avgKmPerMonth')}
        />
        <Field
          type="date"
          label="Licence disc expires"
          value={form.licenceDiscExpiry}
          onChange={set('licenceDiscExpiry')}
        />
        <Field
          type="date"
          label="Service plan ends (date)"
          value={form.servicePlanExpiryDate}
          onChange={set('servicePlanExpiryDate')}
        />
        <Field
          label="Service plan ends (odometer)"
          suffix="km"
          step="1"
          value={form.servicePlanExpiryKm}
          onChange={set('servicePlanExpiryKm')}
        />
        <Field
          label="Service every (distance)"
          suffix="km"
          step="1"
          value={form.serviceIntervalKm}
          onChange={set('serviceIntervalKm')}
        />
        <Field
          label="Service every (time)"
          suffix="months"
          step="1"
          value={form.serviceIntervalMonths}
          onChange={set('serviceIntervalMonths')}
        />
      </div>
      {errors.length > 0 ? <ErrorList errors={errors} /> : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Save my car
        </button>
        {saved ? (
          <span role="status" className="text-sm text-green-800">
            Saved on this device.
          </span>
        ) : null}
      </div>
    </form>
  );
}
