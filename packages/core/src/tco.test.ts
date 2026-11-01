import { describe, expect, it } from 'vitest';
import { checkAffordability, DEFAULT_AFFORDABILITY_THRESHOLD } from './affordability';
import { calculateTCO, compareCars, type TcoInput } from './tco';

const R = (rands: number) => rands * 100;

function noYears<T extends { years?: number }>(car: T): Omit<T, 'years'> {
  const { years, ...rest } = car;
  void years;
  return rest;
}

const cashCar: TcoInput = {
  price: R(200000),
  years: 5,
  annualDepreciationRate: 0.15,
  fuel: { kmPerMonth: 1000, litresPer100km: 8, pricePerLitre: R(20) },
  tyres: { tyreLifeKm: 40000, kmPerMonth: 1000, kmOnCurrentTyres: 0, pricePerTyre: R(1000) },
  insurancePerMonth: R(1500),
  servicingPerYear: R(4000),
  licencePerYear: R(600),
};

describe('calculateTCO (cash purchase)', () => {
  const result = calculateTCO(cashCar);

  it('depreciates the value on a declining balance', () => {
    // 200 000 x 0.85^5 = 88 741.0625 -> R88 741.06
    expect(result.resaleValue).toBe(8874106);
    expect(result.depreciation).toBe(R(200000) - 8874106);
  });

  it('adds up each running cost over the period', () => {
    // 1 000 km x 8/100 = 80 L a month at R20 = R1 600; x 60 months = R96 000
    expect(result.fuel).toBe(R(96000));
    expect(result.totalKm).toBe(60000);
    // A set costs 4 x R1 000; 60 000 km of a 40 000 km life = 1.5 sets = R6 000
    expect(result.tyres).toBe(R(6000));
    expect(result.insurance).toBe(R(90000));
    expect(result.servicing).toBe(R(20000));
    expect(result.licence).toBe(R(3000));
    expect(result.financeCost).toBe(0);
    expect(result.finance).toBeNull();
    expect(result.monthlyFinancePayment).toBe(0);
  });

  it('totals everything and derives per month and per km', () => {
    // 111 258.94 + 96 000 + 6 000 + 90 000 + 20 000 + 3 000
    expect(result.totalCost).toBe(32625894);
    expect(result.costPerMonth).toBe(543765);
    expect(result.costPerKm).toBe(544);
    // (96 000 + 6 000 + 90 000 + 20 000 + 3 000) / 60 = R3 583.33
    expect(result.monthlyRunningCost).toBe(358333);
  });
});

describe('calculateTCO (financed)', () => {
  const financed: TcoInput = {
    ...cashCar,
    price: R(120000),
    years: 2,
    annualDepreciationRate: 0,
    finance: {
      annualRate: 0,
      termMonths: 36,
      initiationFee: R(500),
      monthlyServiceFee: R(100),
    },
  };

  it('counts only the finance costs that fall inside the ownership period', () => {
    const result = calculateTCO(financed);
    // 0% interest, R500 initiation, 24 of the 36 R100 service fees
    expect(result.financeCost).toBe(R(500) + 24 * R(100));
    expect(result.depreciation).toBe(0);
    // R120 000 over 36 months = R3 333.33, plus the R100 fee
    expect(result.monthlyFinancePayment).toBe(333333 + R(100));
    expect(result.finance?.schedule).toHaveLength(36);
  });

  it('counts all the interest when the loan ends inside the period', () => {
    const result = calculateTCO({
      ...financed,
      years: 5,
      finance: { annualRate: 0.12, termMonths: 24 },
    });
    expect(result.financeCost).toBe(result.finance?.totalInterest);
    expect(result.financeCost).toBeGreaterThan(0);
  });

  it('handles a car that is never driven', () => {
    const result = calculateTCO({
      ...cashCar,
      fuel: { ...cashCar.fuel, kmPerMonth: 0 },
      tyres: { ...cashCar.tyres, kmPerMonth: 0 },
    });
    expect(result.totalKm).toBe(0);
    expect(result.fuel).toBe(0);
    expect(result.tyres).toBe(0);
    expect(result.costPerKm).toBeNull();
  });

  it('applies the default period of five years', () => {
    const withoutYears = noYears(cashCar);
    expect(calculateTCO(withoutYears).years).toBe(5);
  });

  it.each([
    ['zero price', { ...cashCar, price: 0 }],
    ['zero years', { ...cashCar, years: 0 }],
    ['over fifteen years', { ...cashCar, years: 16 }],
    ['depreciation above 100%', { ...cashCar, annualDepreciationRate: 1.2 }],
    ['negative insurance', { ...cashCar, insurancePerMonth: -1 }],
    [
      'deposit above price',
      { ...financed, finance: { annualRate: 0.1, termMonths: 12, deposit: R(130000) } },
    ],
  ])('rejects %s', (_label, input) => {
    expect(() => calculateTCO(input as TcoInput)).toThrow();
  });
});

describe('compareCars', () => {
  const cheaper = { ...cashCar, name: 'Hatchback', price: R(150000) };
  const dearer = { ...cashCar, name: 'SUV', price: R(400000), insurancePerMonth: R(2500) };

  it('finds the cheapest car and the gap for the others', () => {
    const a = noYears(cheaper);
    const b = noYears(dearer);
    const result = compareCars({ years: 5, cars: [b, a] });
    expect(result.cheapestIndex).toBe(1);
    expect(result.cars[1]?.extraVsCheapest).toBe(0);
    expect(result.cars[0]?.extraVsCheapest).toBe(
      (result.cars[0]?.result.totalCost ?? 0) - (result.cars[1]?.result.totalCost ?? 0),
    );
    expect(result.cars[0]?.extraVsCheapest).toBeGreaterThan(0);
  });

  it('uses the same period for every car and lets the first win a tie', () => {
    const a = noYears(cheaper);
    const result = compareCars({ years: 3, cars: [a, { ...a, name: 'Twin' }] });
    expect(result.cars.every((c) => c.result.years === 3)).toBe(true);
    expect(result.cheapestIndex).toBe(0);
  });

  it('accepts a single car and rejects none, four, or an unnamed car', () => {
    const a = noYears(cheaper);
    expect(compareCars({ cars: [a] }).cars).toHaveLength(1);
    expect(() => compareCars({ cars: [] })).toThrow();
    expect(() => compareCars({ cars: [a, a, a, a] })).toThrow();
    expect(() => compareCars({ cars: [{ ...a, name: '  ' }] })).toThrow();
  });
});

describe('checkAffordability', () => {
  it('works through an example under the threshold', () => {
    // R5 000 of R30 000 is 16.7%; 20% allows R6 000, leaving R1 000
    const result = checkAffordability({ takeHomePay: R(30000), monthlyCarCost: R(5000) });
    expect(result.threshold).toBe(DEFAULT_AFFORDABILITY_THRESHOLD);
    expect(result.share).toBeCloseTo(0.1667, 4);
    expect(result.maxMonthlyCost).toBe(R(6000));
    expect(result.headroom).toBe(R(1000));
    expect(result.affordable).toBe(true);
  });

  it('flags a cost over the threshold with negative headroom', () => {
    const result = checkAffordability({ takeHomePay: R(30000), monthlyCarCost: R(7000) });
    expect(result.headroom).toBe(-R(1000));
    expect(result.affordable).toBe(false);
  });

  it('treats exactly the threshold as affordable and honours a custom threshold', () => {
    expect(checkAffordability({ takeHomePay: R(30000), monthlyCarCost: R(6000) }).affordable).toBe(
      true,
    );
    const strict = checkAffordability({
      takeHomePay: R(30000),
      monthlyCarCost: R(5000),
      threshold: 0.15,
    });
    expect(strict.maxMonthlyCost).toBe(R(4500));
    expect(strict.affordable).toBe(false);
  });

  it.each([
    ['zero pay', { takeHomePay: 0, monthlyCarCost: 100 }],
    ['negative cost', { takeHomePay: 1000, monthlyCarCost: -1 }],
    ['zero threshold', { takeHomePay: 1000, monthlyCarCost: 100, threshold: 0 }],
    ['threshold above 100%', { takeHomePay: 1000, monthlyCarCost: 100, threshold: 1.5 }],
  ])('rejects %s', (_label, input) => {
    expect(() => checkAffordability(input)).toThrow();
  });
});
