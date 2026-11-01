'use client';

import {
  compareCars,
  compareInputSchema,
  formatZar,
  randsToCents,
  type CompareInput,
  type ComparisonResult,
} from '@carwise/core';
import { useMemo, useState } from 'react';
import { ErrorList, Field } from '@/components/ui';

interface CarForm {
  name: string;
  price: string;
  financed: boolean;
  deposit: string;
  ratePercent: string;
  termMonths: string;
  litresPer100km: string;
  insurancePerMonth: string;
  servicingPerYear: string;
  licencePerYear: string;
  pricePerTyre: string;
  tyreLifeKm: string;
  depreciationPercent: string;
}

interface Shared {
  years: string;
  kmPerMonth: string;
  fuelPricePerLitre: string;
}

const EXAMPLE_CAR: CarForm = {
  name: '',
  price: '250000',
  financed: true,
  deposit: '25000',
  ratePercent: '11.5',
  termMonths: '60',
  litresPer100km: '6.5',
  insurancePerMonth: '1200',
  servicingPerYear: '4000',
  licencePerYear: '600',
  pricePerTyre: '1200',
  tyreLifeKm: '40000',
  depreciationPercent: '15',
};

const INITIAL_SHARED: Shared = { years: '5', kmPerMonth: '1500', fuelPricePerLitre: '20' };

const num = (value: string): number => (value.trim() === '' ? 0 : Number(value));

function toInput(shared: Shared, cars: readonly CarForm[]): CompareInput {
  const kmPerMonth = num(shared.kmPerMonth);
  return {
    years: num(shared.years),
    cars: cars.map((car, i) => ({
      name: car.name.trim() || `Car ${i + 1}`,
      price: randsToCents(num(car.price)),
      ...(car.financed
        ? {
            finance: {
              deposit: randsToCents(num(car.deposit)),
              annualRate: num(car.ratePercent) / 100,
              termMonths: num(car.termMonths),
            },
          }
        : {}),
      fuel: {
        kmPerMonth,
        litresPer100km: num(car.litresPer100km),
        pricePerLitre: randsToCents(num(shared.fuelPricePerLitre)),
      },
      tyres: {
        tyreLifeKm: num(car.tyreLifeKm),
        kmPerMonth,
        kmOnCurrentTyres: 0,
        pricePerTyre: randsToCents(num(car.pricePerTyre)),
      },
      insurancePerMonth: randsToCents(num(car.insurancePerMonth)),
      servicingPerYear: randsToCents(num(car.servicingPerYear)),
      licencePerYear: randsToCents(num(car.licencePerYear)),
      annualDepreciationRate: num(car.depreciationPercent) / 100,
    })),
  };
}

export function CarComparison() {
  const [shared, setShared] = useState<Shared>(INITIAL_SHARED);
  const [cars, setCars] = useState<CarForm[]>([
    { ...EXAMPLE_CAR, name: 'Car A' },
    {
      ...EXAMPLE_CAR,
      name: 'Car B',
      price: '320000',
      litresPer100km: '7.5',
      depreciationPercent: '12',
    },
  ]);

  const setCar = (index: number, patch: Partial<CarForm>) =>
    setCars((prev) => prev.map((car, i) => (i === index ? { ...car, ...patch } : car)));

  const outcome = useMemo(() => {
    const input = toInput(shared, cars);
    const parsed = compareInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.issues.map((i) => i.message) };
    }
    return { ok: true as const, comparison: compareCars(input) };
  }, [shared, cars]);

  return (
    <div className="space-y-8">
      <fieldset className="grid gap-4 rounded-lg border border-slate-200 p-5 sm:grid-cols-3">
        <legend className="px-2 font-semibold">The same for every car</legend>
        <Field
          label="Years you keep the car"
          step="1"
          value={shared.years}
          onChange={(years) => setShared({ ...shared, years })}
        />
        <Field
          label="Distance per month"
          suffix="km"
          value={shared.kmPerMonth}
          onChange={(kmPerMonth) => setShared({ ...shared, kmPerMonth })}
        />
        <Field
          label="Fuel price"
          suffix="R/L"
          value={shared.fuelPricePerLitre}
          onChange={(fuelPricePerLitre) => setShared({ ...shared, fuelPricePerLitre })}
        />
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cars.map((car, i) => (
          <fieldset key={i} className="space-y-3 rounded-lg border border-slate-200 p-5">
            <legend className="px-2 font-semibold">Car {i + 1}</legend>
            <label className="block text-sm font-medium">
              Name
              <input
                value={car.name}
                onChange={(e) => setCar(i, { name: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <Field
              label="Price"
              suffix="R"
              value={car.price}
              onChange={(price) => setCar(i, { price })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={car.financed}
                onChange={(e) => setCar(i, { financed: e.target.checked })}
              />
              Financed (otherwise paid in cash)
            </label>
            {car.financed ? (
              <>
                <Field
                  label="Deposit"
                  suffix="R"
                  value={car.deposit}
                  onChange={(deposit) => setCar(i, { deposit })}
                />
                <Field
                  label="Interest rate"
                  suffix="%"
                  value={car.ratePercent}
                  onChange={(ratePercent) => setCar(i, { ratePercent })}
                />
                <Field
                  label="Term"
                  suffix="months"
                  step="1"
                  value={car.termMonths}
                  onChange={(termMonths) => setCar(i, { termMonths })}
                />
              </>
            ) : null}
            <Field
              label="Fuel consumption"
              suffix="L/100 km"
              value={car.litresPer100km}
              onChange={(litresPer100km) => setCar(i, { litresPer100km })}
            />
            <Field
              label="Insurance (from your quote)"
              suffix="R / month"
              value={car.insurancePerMonth}
              onChange={(insurancePerMonth) => setCar(i, { insurancePerMonth })}
            />
            <Field
              label="Servicing and maintenance"
              suffix="R / year"
              value={car.servicingPerYear}
              onChange={(servicingPerYear) => setCar(i, { servicingPerYear })}
            />
            <Field
              label="Licence disc"
              suffix="R / year"
              value={car.licencePerYear}
              onChange={(licencePerYear) => setCar(i, { licencePerYear })}
            />
            <Field
              label="Price per tyre"
              suffix="R"
              value={car.pricePerTyre}
              onChange={(pricePerTyre) => setCar(i, { pricePerTyre })}
            />
            <Field
              label="Tyre life"
              suffix="km"
              step="1"
              value={car.tyreLifeKm}
              onChange={(tyreLifeKm) => setCar(i, { tyreLifeKm })}
            />
            <Field
              label="Loses value per year"
              suffix="%"
              value={car.depreciationPercent}
              onChange={(depreciationPercent) => setCar(i, { depreciationPercent })}
            />
            {cars.length > 1 ? (
              <button
                type="button"
                className="text-sm text-red-700 underline"
                onClick={() => setCars((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove this car
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>
      {cars.length < 3 ? (
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          onClick={() =>
            setCars((prev) => [...prev, { ...EXAMPLE_CAR, name: `Car ${prev.length + 1}` }])
          }
        >
          Add a car
        </button>
      ) : null}

      <div aria-live="polite">
        {outcome.ok ? (
          <ResultsTable comparison={outcome.comparison} />
        ) : (
          <ErrorList errors={outcome.errors} />
        )}
      </div>
    </div>
  );
}

const ROWS = [
  ['Depreciation', 'depreciation'],
  ['Finance costs (interest and fees)', 'financeCost'],
  ['Fuel', 'fuel'],
  ['Tyres', 'tyres'],
  ['Insurance', 'insurance'],
  ['Servicing and maintenance', 'servicing'],
  ['Licence', 'licence'],
] as const;

function ResultsTable({ comparison }: { comparison: ComparisonResult }) {
  const { cars, cheapestIndex } = comparison;
  const years = cars[0]?.result.years ?? 0;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 p-5">
      <h2 className="text-lg font-semibold">Total cost of ownership over {years} years</h2>
      <table className="mt-3 w-full min-w-[32rem] text-right text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="py-1 text-left font-medium"></th>
            {cars.map((car, i) => (
              <th key={i} className="py-1 font-medium">
                {car.name}
                {i === cheapestIndex && cars.length > 1 ? ' (lowest)' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, key]) => (
            <tr key={key} className="border-t border-slate-100">
              <th className="py-1 text-left font-normal">{label}</th>
              {cars.map((car, i) => (
                <td key={i}>{formatZar(car.result[key])}</td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-slate-300 font-semibold">
            <th className="py-1 text-left">Total cost</th>
            {cars.map((car, i) => (
              <td key={i}>{formatZar(car.result.totalCost)}</td>
            ))}
          </tr>
          <tr>
            <th className="py-1 text-left font-normal">Per month</th>
            {cars.map((car, i) => (
              <td key={i}>{formatZar(car.result.costPerMonth)}</td>
            ))}
          </tr>
          <tr>
            <th className="py-1 text-left font-normal">Per km</th>
            {cars.map((car, i) => (
              <td key={i}>
                {car.result.costPerKm === null ? 'n/a' : formatZar(car.result.costPerKm)}
              </td>
            ))}
          </tr>
          <tr>
            <th className="py-1 text-left font-normal">More than the lowest</th>
            {cars.map((car, i) => (
              <td key={i}>{car.extraVsCheapest === 0 ? '-' : formatZar(car.extraVsCheapest)}</td>
            ))}
          </tr>
          <tr className="border-t border-slate-100">
            <th className="py-1 text-left font-normal">
              Monthly cash cost (loan payment plus running costs)
            </th>
            {cars.map((car, i) => (
              <td key={i}>
                {formatZar(car.result.monthlyFinancePayment + car.result.monthlyRunningCost)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500">
        The purchase price is not added on top: you get most of it back when you sell, so only the
        loss in value counts. Depreciation here is a simple yearly percentage you choose. The
        example figures are placeholders, so replace them with real quotes.
      </p>
    </div>
  );
}
