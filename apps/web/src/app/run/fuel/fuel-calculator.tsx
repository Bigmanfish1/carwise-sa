'use client';

import {
  calculateFuelCost,
  centsToRands,
  formatZar,
  fuelInputSchema,
  fuelPriceFor,
  fuelPrices,
  randsToCents,
  type FuelType,
  type FuelZone,
} from '@carwise/core';
import { useMemo, useState } from 'react';
import { DataSource, ErrorList, Field, SelectField, Stat } from '@/components/ui';

const num = (value: string): number => (value.trim() === '' ? 0 : Number(value));
const priceText = (zone: FuelZone, type: FuelType) =>
  String(centsToRands(fuelPriceFor(fuelPrices, zone, type)));

export function FuelCalculator() {
  const [kmPerMonth, setKmPerMonth] = useState('1500');
  const [consumption, setConsumption] = useState('8');
  const [zone, setZone] = useState<FuelZone>('inland');
  const [fuelType, setFuelType] = useState<FuelType>('petrol95');
  const [price, setPrice] = useState(priceText('inland', 'petrol95'));

  const pickZone = (next: string) => {
    setZone(next as FuelZone);
    setPrice(priceText(next as FuelZone, fuelType));
  };
  const pickType = (next: string) => {
    setFuelType(next as FuelType);
    setPrice(priceText(zone, next as FuelType));
  };

  const outcome = useMemo(() => {
    const input = {
      kmPerMonth: num(kmPerMonth),
      litresPer100km: num(consumption),
      pricePerLitre: randsToCents(num(price)),
    };
    const parsed = fuelInputSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false as const, errors: parsed.error.issues.map((i) => i.message) };
    return { ok: true as const, result: calculateFuelCost(input) };
  }, [kmPerMonth, consumption, price]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Fuel inputs">
        <Field label="Distance per month" suffix="km" value={kmPerMonth} onChange={setKmPerMonth} />
        <Field
          label="Fuel consumption"
          suffix="L/100 km"
          value={consumption}
          onChange={setConsumption}
        />
        <SelectField
          label="Region"
          value={zone}
          onChange={pickZone}
          options={[
            { value: 'inland', label: 'Inland' },
            { value: 'coastal', label: 'Coastal' },
          ]}
        />
        <SelectField
          label="Fuel"
          value={fuelType}
          onChange={pickType}
          options={[
            { value: 'petrol95', label: 'Petrol 95' },
            { value: 'diesel50', label: 'Diesel 50 ppm' },
          ]}
        />
        <Field
          label="Price per litre (edit if the pump price differs)"
          suffix="R/L"
          value={price}
          onChange={setPrice}
        />
        <DataSource data={fuelPrices} />
      </form>
      <div aria-live="polite">
        {outcome.ok ? (
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-5">
            <Stat
              label="Fuel cost per month"
              value={formatZar(outcome.result.costPerMonth)}
              strong
            />
            <Stat label="Fuel cost per year" value={formatZar(outcome.result.costPerYear)} />
            <Stat
              label="Litres per month"
              value={`${outcome.result.litresPerMonth.toFixed(1)} L`}
            />
            <Stat label="Cost per km" value={formatZar(outcome.result.costPerKm)} />
          </dl>
        ) : (
          <ErrorList errors={outcome.errors} />
        )}
      </div>
    </div>
  );
}
