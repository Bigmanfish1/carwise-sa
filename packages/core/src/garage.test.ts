import { describe, expect, it } from 'vitest';
import {
  addEntry,
  computeReminders,
  emptyGarage,
  exportGarage,
  importGarage,
  removeEntry,
  setCar,
  sortedEntries,
  summariseSpend,
  type CarProfileInput,
  type Garage,
} from './garage';

const R = (rands: number) => rands * 100;

const car: CarProfileInput = { name: 'Polo', odometerKm: 20000, avgKmPerMonth: 1000 };

function garageWith(profile: Partial<CarProfileInput> = {}): Garage {
  return setCar(emptyGarage(), { ...car, ...profile });
}

const serviceEntry = {
  id: 's1',
  date: '2025-01-31',
  kind: 'service' as const,
  description: 'Full service',
  cost: R(2500),
  odometerKm: 10000,
};

describe('garage data', () => {
  it('starts empty', () => {
    expect(emptyGarage()).toEqual({ version: 1, car: null, entries: [] });
  });

  it('stores a validated car profile', () => {
    const garage = setCar(emptyGarage(), { name: '  Polo  ', odometerKm: 12345 });
    expect(garage.car?.name).toBe('Polo');
    expect(garage.car?.avgKmPerMonth).toBe(0);
  });

  it.each([
    ['a blank name', { name: '  ', odometerKm: 0 }],
    ['a negative odometer', { name: 'Polo', odometerKm: -1 }],
    [
      'an impossible licence date',
      { name: 'Polo', odometerKm: 0, licenceDiscExpiry: '2025-13-45' },
    ],
    ['a badly formatted date', { name: 'Polo', odometerKm: 0, licenceDiscExpiry: '1 June 2025' }],
  ])('rejects %s', (_label, profile) => {
    expect(() => setCar(emptyGarage(), profile)).toThrow();
  });

  it('adds and removes log entries without changing the original', () => {
    const start = emptyGarage();
    const added = addEntry(start, serviceEntry);
    expect(start.entries).toHaveLength(0);
    expect(added.entries).toHaveLength(1);
    expect(removeEntry(added, 's1').entries).toHaveLength(0);
    expect(removeEntry(added, 'nope').entries).toHaveLength(1);
  });

  it('rejects an entry with no description, a bad date or a negative cost', () => {
    const start = emptyGarage();
    expect(() => addEntry(start, { ...serviceEntry, description: '' })).toThrow();
    expect(() => addEntry(start, { ...serviceEntry, date: 'yesterday' })).toThrow();
    expect(() => addEntry(start, { ...serviceEntry, cost: -1 })).toThrow();
  });

  it('lists entries newest first, with the later addition first on the same day', () => {
    let garage = emptyGarage();
    garage = addEntry(garage, { ...serviceEntry, id: 'a', date: '2025-01-01' });
    garage = addEntry(garage, { ...serviceEntry, id: 'b', date: '2025-03-01' });
    garage = addEntry(garage, { ...serviceEntry, id: 'c', date: '2025-03-01' });
    expect(sortedEntries(garage).map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('summariseSpend', () => {
  it('totals by kind, overall and for one year', () => {
    let garage = emptyGarage();
    garage = addEntry(garage, { ...serviceEntry, id: '1', cost: R(1500) });
    garage = addEntry(garage, { ...serviceEntry, id: '2', kind: 'repair', cost: R(800) });
    garage = addEntry(garage, {
      ...serviceEntry,
      id: '3',
      kind: 'part',
      date: '2024-06-01',
      cost: R(200),
    });

    const all = summariseSpend(garage);
    expect(all.total).toBe(R(2500));
    expect(all.byKind.service).toBe(R(1500));
    expect(all.byKind.tyres).toBe(0);

    const y2025 = summariseSpend(garage, 2025);
    expect(y2025.total).toBe(R(2300));
    expect(y2025.byKind.part).toBe(0);
  });
});

describe('export and import', () => {
  it('round-trips a garage exactly', () => {
    const garage = addEntry(garageWith({ licenceDiscExpiry: '2025-09-01' }), serviceEntry);
    const result = importGarage(exportGarage(garage));
    expect(result).toEqual({ ok: true, garage });
  });

  it('labels the file as a Carwise export', () => {
    expect(JSON.parse(exportGarage(emptyGarage())).app).toBe('carwise-sa');
  });

  it('accepts a file with no entries list', () => {
    const result = importGarage('{"version":1,"car":null}');
    expect(result).toEqual({ ok: true, garage: emptyGarage() });
  });

  it('reports bad JSON, a different version and the wrong shape', () => {
    expect(importGarage('{nope')).toEqual({ ok: false, error: 'This file is not valid JSON.' });
    expect(importGarage('{"version":2,"car":null}')).toMatchObject({ ok: false });
    expect(importGarage('{"version":1,"car":{"name":"","odometerKm":0}}')).toMatchObject({
      ok: false,
      error: expect.stringContaining('car.name'),
    });
    expect(importGarage('[]')).toMatchObject({ ok: false });
    expect(importGarage('null')).toMatchObject({ ok: false });
  });

  it('describes the version problem clearly', () => {
    const result = importGarage('{"version":2}');
    expect(result).toEqual({
      ok: false,
      error: 'This file was made by a different version of Carwise SA.',
    });
  });
});

describe('computeReminders', () => {
  const today = '2025-06-01';

  it('returns nothing without a car', () => {
    expect(computeReminders(emptyGarage(), today)).toEqual([]);
  });

  it('returns nothing when no dates or intervals are set', () => {
    expect(computeReminders(garageWith(), today)).toEqual([]);
  });

  it('classifies the licence disc as ok, soon or overdue', () => {
    const status = (licenceDiscExpiry: string) =>
      computeReminders(garageWith({ licenceDiscExpiry }), today)[0];
    expect(status('2025-09-01')).toMatchObject({ status: 'ok', daysRemaining: 92 });
    expect(status('2025-06-20')).toMatchObject({ status: 'soon', daysRemaining: 19 });
    expect(status('2025-07-01')).toMatchObject({ status: 'soon', daysRemaining: 30 });
    expect(status('2025-06-01')).toMatchObject({ status: 'soon', daysRemaining: 0 });
    expect(status('2025-05-30')).toMatchObject({
      status: 'overdue',
      daysRemaining: -2,
      detail: 'Expires 2 days ago',
    });
  });

  it('watches both the date and the distance of a service plan', () => {
    const plan = (odometerKm: number, servicePlanExpiryDate = '2026-01-01') =>
      computeReminders(
        garageWith({ odometerKm, servicePlanExpiryDate, servicePlanExpiryKm: 100000 }),
        today,
      )[0];
    expect(plan(98500)).toMatchObject({ status: 'ok', kmRemaining: 1500 });
    expect(plan(99500)).toMatchObject({ status: 'soon', kmRemaining: 500 });
    expect(plan(100200)).toMatchObject({ status: 'overdue', kmRemaining: -200 });
    expect(plan(90000, '2025-05-01')).toMatchObject({ status: 'overdue' });
  });

  it('supports a service plan with only a distance or only a date', () => {
    const kmOnly = computeReminders(garageWith({ servicePlanExpiryKm: 50000 }), today)[0];
    expect(kmOnly).toMatchObject({ kmRemaining: 30000, daysRemaining: null, dueDate: null });
    const dateOnly = computeReminders(
      garageWith({ servicePlanExpiryDate: '2025-12-01' }),
      today,
    )[0];
    expect(dateOnly).toMatchObject({ kmRemaining: null, status: 'ok' });
  });

  it('predicts the next service from the last logged one', () => {
    const garage = addEntry(
      garageWith({ serviceIntervalKm: 15000, serviceIntervalMonths: 12 }),
      serviceEntry,
    );
    const [reminder] = computeReminders(garage, today);
    // 5 000 km left at 1 000 km a month is 153 days, which beats the 12 month limit
    expect(reminder).toMatchObject({
      id: 'next-service',
      status: 'ok',
      dueDate: '2025-11-01',
      daysRemaining: 153,
      kmRemaining: 5000,
    });
  });

  it('flags a service that is overdue by distance', () => {
    const garage = addEntry(
      garageWith({ odometerKm: 26000, serviceIntervalKm: 15000 }),
      serviceEntry,
    );
    expect(computeReminders(garage, today)[0]).toMatchObject({
      status: 'overdue',
      kmRemaining: -1000,
    });
  });

  it('falls back to the time interval when the last service has no odometer reading', () => {
    const { odometerKm: _km, ...withoutKm } = serviceEntry;
    void _km;
    const garage = addEntry(
      garageWith({ serviceIntervalKm: 15000, serviceIntervalMonths: 12 }),
      withoutKm,
    );
    expect(computeReminders(garage, today)[0]).toMatchObject({
      status: 'ok',
      dueDate: '2026-01-31',
      kmRemaining: null,
    });
  });

  it('asks for more information when it cannot predict', () => {
    const noLog = computeReminders(garageWith({ serviceIntervalMonths: 12 }), today)[0];
    expect(noLog).toMatchObject({
      status: 'unknown',
      detail: 'Log your last service to get a prediction.',
    });

    const { odometerKm: _km, ...withoutKm } = serviceEntry;
    void _km;
    const garage = addEntry(garageWith({ serviceIntervalKm: 15000 }), withoutKm);
    expect(computeReminders(garage, today)[0]).toMatchObject({
      status: 'unknown',
      detail: expect.stringContaining('odometer'),
    });
  });

  it('uses the most recent service and ignores repairs', () => {
    let garage = garageWith({ serviceIntervalMonths: 12 });
    garage = addEntry(garage, { ...serviceEntry, id: 'old', date: '2023-01-01' });
    garage = addEntry(garage, { ...serviceEntry, id: 'new', date: '2025-03-01' });
    garage = addEntry(garage, { ...serviceEntry, id: 'fix', kind: 'repair', date: '2025-05-01' });
    expect(computeReminders(garage, today)[0]).toMatchObject({ dueDate: '2026-03-01' });
  });

  it('copes with an odometer lower than the last service reading', () => {
    const garage = addEntry(
      garageWith({ odometerKm: 5000, serviceIntervalKm: 15000 }),
      serviceEntry,
    );
    expect(computeReminders(garage, today)[0]).toMatchObject({ kmRemaining: 15000 });
  });

  it('sorts the most urgent reminder first', () => {
    const garage = garageWith({
      licenceDiscExpiry: '2025-12-01',
      servicePlanExpiryDate: '2025-05-01',
      serviceIntervalMonths: 12,
    });
    expect(computeReminders(garage, today).map((r) => r.id)).toEqual([
      'service-plan',
      'licence-disc',
      'next-service',
    ]);
  });

  it('describes a reminder that falls due today', () => {
    const [reminder] = computeReminders(garageWith({ licenceDiscExpiry: today }), today);
    expect(reminder?.detail).toBe('Expires today');
  });
});
