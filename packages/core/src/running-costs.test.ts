import { describe, expect, it } from 'vitest';
import { fuelPrices, licenceFees } from './data';
import { calculateFuelCost, fuelPriceFor } from './fuel';
import { estimateLicenceFee } from './licence';
import {
  PROVINCES,
  PROVINCE_NAMES,
  fuelPricesSchema,
  licenceFeesSchema,
  type LicenceFees,
} from './reference-data';
import { addMonths, planNextService } from './service';
import { estimateTyreReplacement } from './tyres';

describe('reference data files', () => {
  it('load and validate', () => {
    expect(fuelPrices.id).toBe('fuel-prices');
    expect(licenceFees.id).toBe('licence-fees');
  });

  it('cover every province', () => {
    for (const code of PROVINCES) {
      expect(licenceFees.values.provinces[code].bands.length).toBeGreaterThan(0);
      expect(PROVINCE_NAMES[code]).toBeTruthy();
    }
  });

  it('are flagged unverified until a human checks the source', () => {
    // Flip these expectations deliberately, per file, once the figures are checked.
    expect(fuelPrices.verified).toBe(false);
    expect(licenceFees.verified).toBe(false);
  });

  it('reject a bad envelope', () => {
    expect(() => fuelPricesSchema.parse({ ...fuelPrices, effectiveDate: '1 Jan 2025' })).toThrow();
  });

  it('reject licence bands that are out of order or have no open-ended top band', () => {
    const bad = (bands: unknown) => ({
      ...licenceFees,
      values: {
        ...licenceFees.values,
        provinces: { ...licenceFees.values.provinces, GP: { bands } },
      },
    });
    expect(() =>
      licenceFeesSchema.parse(
        bad([
          { maxTareKg: 2000, fee: 1 },
          { maxTareKg: 1000, fee: 2 },
          { maxTareKg: null, fee: 3 },
        ]),
      ),
    ).toThrow();
    expect(() => licenceFeesSchema.parse(bad([{ maxTareKg: 1000, fee: 1 }]))).toThrow();
    expect(() =>
      licenceFeesSchema.parse(
        bad([
          { maxTareKg: null, fee: 1 },
          { maxTareKg: null, fee: 2 },
        ]),
      ),
    ).toThrow();
  });
});

describe('calculateFuelCost', () => {
  it('works through a monthly example', () => {
    // 1 500 km at 8 L/100 km = 120 L; at R20.00/L = R2 400 a month
    const result = calculateFuelCost({ kmPerMonth: 1500, litresPer100km: 8, pricePerLitre: 2000 });
    expect(result.litresPerMonth).toBe(120);
    expect(result.costPerMonth).toBe(240000);
    expect(result.costPerYear).toBe(2880000);
    expect(result.costPerKm).toBe(160);
  });

  it('handles a car that is not driven', () => {
    const result = calculateFuelCost({ kmPerMonth: 0, litresPer100km: 8, pricePerLitre: 2000 });
    expect(result.costPerMonth).toBe(0);
    expect(result.costPerKm).toBe(160);
  });

  it.each([
    ['zero consumption', { kmPerMonth: 100, litresPer100km: 0, pricePerLitre: 2000 }],
    ['negative distance', { kmPerMonth: -1, litresPer100km: 8, pricePerLitre: 2000 }],
    ['fractional cents', { kmPerMonth: 100, litresPer100km: 8, pricePerLitre: 20.5 }],
  ])('rejects %s', (_label, input) => {
    expect(() => calculateFuelCost(input)).toThrow();
  });

  it('looks up the price by zone and fuel type', () => {
    expect(fuelPriceFor(fuelPrices, 'inland', 'petrol95')).toBe(fuelPrices.values.inland.petrol95);
    expect(fuelPriceFor(fuelPrices, 'coastal', 'diesel50')).toBe(
      fuelPrices.values.coastal.diesel50,
    );
  });
});

describe('estimateLicenceFee', () => {
  it('picks the band that contains the tare mass (limit inclusive)', () => {
    const gp = licenceFees.values.provinces.GP.bands;
    expect(estimateLicenceFee(licenceFees, { province: 'GP', tareKg: 1000 }).fee).toBe(gp[0]?.fee);
    expect(estimateLicenceFee(licenceFees, { province: 'GP', tareKg: 1001 }).fee).toBe(gp[1]?.fee);
  });

  it('uses the open-ended top band for heavy vehicles', () => {
    const result = estimateLicenceFee(licenceFees, { province: 'WC', tareKg: 9000 });
    expect(result.bandMaxTareKg).toBeNull();
  });

  it('rejects invalid input', () => {
    expect(() => estimateLicenceFee(licenceFees, { province: 'GP', tareKg: 0 })).toThrow();
    expect(() =>
      estimateLicenceFee(licenceFees, { province: 'XX' as 'GP', tareKg: 1000 }),
    ).toThrow();
  });

  it('fails loudly if data has no matching band', () => {
    const broken = {
      ...licenceFees,
      values: {
        ...licenceFees.values,
        provinces: { ...licenceFees.values.provinces, GP: { bands: [{ maxTareKg: 500, fee: 1 }] } },
      },
    } as LicenceFees;
    expect(() => estimateLicenceFee(broken, { province: 'GP', tareKg: 900 })).toThrow(
      /No licence fee band/,
    );
  });
});

describe('addMonths', () => {
  it('clamps to the end of shorter months', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2025-11-30', 3)).toBe('2026-02-28');
  });

  it('crosses year boundaries', () => {
    expect(addMonths('2025-06-15', 12)).toBe('2026-06-15');
  });
});

describe('planNextService', () => {
  const base = {
    currentKm: 20000,
    lastServiceKm: 10000,
    lastServiceDate: '2025-01-31',
    intervalKm: 15000,
    intervalMonths: 12,
    avgKmPerMonth: 1000,
    today: '2025-06-01',
  };

  it('predicts the km interval arriving first', () => {
    // 5 000 km left at 1 000 km/month = 152.19 days, rounded up to 153: 1 June + 153 days
    const result = planNextService(base);
    expect(result.nextDueKm).toBe(25000);
    expect(result.kmRemaining).toBe(5000);
    expect(result.dueDateByKm).toBe('2025-11-01');
    expect(result.dueDateByMonths).toBe('2026-01-31');
    expect(result.nextDueDate).toBe('2025-11-01');
    expect(result.dueBy).toBe('km');
    expect(result.daysRemaining).toBe(153);
    expect(result.overdue).toBe(false);
  });

  it('predicts the month interval arriving first for a low-mileage car', () => {
    const result = planNextService({ ...base, avgKmPerMonth: 100 });
    expect(result.dueBy).toBe('months');
    expect(result.nextDueDate).toBe('2026-01-31');
  });

  it('flags a km overrun as due today and overdue', () => {
    const result = planNextService({ ...base, currentKm: 26000 });
    expect(result.kmRemaining).toBe(-1000);
    expect(result.dueDateByKm).toBe('2025-06-01');
    expect(result.overdue).toBe(true);
    expect(result.daysRemaining).toBe(0);
  });

  it('flags an expired month interval as overdue', () => {
    const result = planNextService({
      ...base,
      intervalKm: undefined,
      lastServiceDate: '2023-01-01',
      today: '2025-01-01',
    });
    expect(result.nextDueKm).toBeNull();
    expect(result.kmRemaining).toBeNull();
    expect(result.dueDateByMonths).toBe('2024-01-01');
    expect(result.overdue).toBe(true);
    expect(result.daysRemaining).toBeLessThan(0);
  });

  it('cannot predict a km date when the car is not driven', () => {
    const result = planNextService({ ...base, avgKmPerMonth: 0, intervalMonths: undefined });
    expect(result.dueDateByKm).toBeNull();
    expect(result.nextDueDate).toBeNull();
    expect(result.dueBy).toBeNull();
    expect(result.daysRemaining).toBeNull();
  });

  it.each([
    ['no interval', { ...base, intervalKm: undefined, intervalMonths: undefined }],
    ['odometer below last service', { ...base, currentKm: 5000 }],
    ['bad date format', { ...base, today: '01/06/2025' }],
    ['impossible date', { ...base, lastServiceDate: '2025-13-45' }],
    ['non-integer months', { ...base, intervalMonths: 6.5 }],
  ])('rejects %s', (_label, input) => {
    expect(() => planNextService(input)).toThrow();
  });
});

describe('estimateTyreReplacement', () => {
  const base = {
    tyreLifeKm: 40000,
    kmPerMonth: 1000,
    kmOnCurrentTyres: 10000,
    pricePerTyre: 150000,
    fittingPerTyre: 5000,
    alignment: 40000,
  };

  it('works through a worked example', () => {
    // 4 x (R1 500 + R50) + R400 alignment = R6 600; over 40 000 km = 16.5c/km
    const result = estimateTyreReplacement(base);
    expect(result.replacementCost).toBe(660000);
    expect(result.costPerKm).toBe(17);
    expect(result.costPerMonth).toBe(16500);
    expect(result.kmRemaining).toBe(30000);
    expect(result.monthsRemaining).toBe(30);
    expect(result.due).toBe(false);
  });

  it('flags worn tyres and never reports negative distance', () => {
    const result = estimateTyreReplacement({ ...base, kmOnCurrentTyres: 45000 });
    expect(result.kmRemaining).toBe(0);
    expect(result.due).toBe(true);
  });

  it('handles a car that is not driven and applies defaults', () => {
    const result = estimateTyreReplacement({
      tyreLifeKm: 40000,
      kmPerMonth: 0,
      kmOnCurrentTyres: 0,
      pricePerTyre: 100000,
    });
    expect(result.monthsRemaining).toBeNull();
    expect(result.replacementCost).toBe(400000);
    expect(result.costPerMonth).toBe(0);
  });

  it.each([
    ['zero tyre life', { ...base, tyreLifeKm: 0 }],
    ['no tyres', { ...base, tyreCount: 0 }],
    ['negative price', { ...base, pricePerTyre: -1 }],
  ])('rejects %s', (_label, input) => {
    expect(() => estimateTyreReplacement(input)).toThrow();
  });
});
