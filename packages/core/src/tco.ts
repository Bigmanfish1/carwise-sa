import { z } from 'zod';
import { calculateFinance, financeBaseSchema, type FinanceResult } from './finance';
import { calculateFuelCost, fuelInputSchema } from './fuel';
import { roundCents, type Cents } from './money';
import { estimateTyreReplacement, tyreInputSchema } from './tyres';

const cents = z.number().int().nonnegative();

/** Everything about one car except the ownership period. */
export const tcoCarSchema = z.object({
  /** Cash price of the vehicle. */
  price: cents.refine((v) => v > 0, 'Price must be greater than zero'),
  /** Finance terms. Leave out for a cash purchase. The price comes from `price`. */
  finance: financeBaseSchema.omit({ price: true }).optional(),
  fuel: fuelInputSchema,
  tyres: tyreInputSchema,
  /** Insurance premium per month, from the user's own quote. */
  insurancePerMonth: cents.default(0),
  /** Servicing and maintenance per year. */
  servicingPerYear: cents.default(0),
  /** Licence disc renewal per year. */
  licencePerYear: cents.default(0),
  /** Yearly loss in value as a decimal (0.15 = 15%), compounding on the remaining value. */
  annualDepreciationRate: z.number().min(0).max(1),
});

export const tcoInputSchema = tcoCarSchema.extend({
  /** How long the car is kept. */
  years: z.number().int().min(1).max(15).default(5),
});
export type TcoInput = z.input<typeof tcoInputSchema>;

export interface TcoResult {
  years: number;
  totalKm: number;
  resaleValue: Cents;
  /** Price less the expected resale value after `years`. */
  depreciation: Cents;
  /** Interest, initiation fee and service fees that fall inside the ownership period. */
  financeCost: Cents;
  fuel: Cents;
  insurance: Cents;
  servicing: Cents;
  tyres: Cents;
  licence: Cents;
  /** Depreciation plus finance cost plus all running costs. */
  totalCost: Cents;
  costPerMonth: Cents;
  /** null when the car is not driven. */
  costPerKm: Cents | null;
  /** Fuel, insurance, servicing, tyres and licence per month, excluding finance and depreciation. */
  monthlyRunningCost: Cents;
  /** Monthly instalment plus service fee while the loan runs. 0 for a cash purchase. */
  monthlyFinancePayment: Cents;
  finance: FinanceResult | null;
}

/**
 * Total cost of ownership over `years`. Built on the other calculators. The purchase price is not
 * added on top of depreciation, because the price is recovered through the resale value.
 */
export function calculateTCO(input: TcoInput): TcoResult {
  const v = tcoInputSchema.parse(input);
  const months = v.years * 12;

  const resaleValue = roundCents(v.price * Math.pow(1 - v.annualDepreciationRate, v.years));
  const depreciation = v.price - resaleValue;

  let finance: FinanceResult | null = null;
  let financeCost = 0;
  if (v.finance) {
    finance = calculateFinance({ ...v.finance, price: v.price });
    const inPeriod = finance.schedule.slice(0, months);
    const interest = inPeriod.reduce((sum, row) => sum + row.interest, 0);
    financeCost = interest + v.finance.initiationFee + finance.monthlyServiceFee * inPeriod.length;
  }

  const fuel = calculateFuelCost(v.fuel).costPerYear * v.years;
  const totalKm = v.fuel.kmPerMonth * months;
  const tyreSet = estimateTyreReplacement(v.tyres);
  const tyres = roundCents((tyreSet.replacementCost * totalKm) / v.tyres.tyreLifeKm);
  const insurance = v.insurancePerMonth * months;
  const servicing = v.servicingPerYear * v.years;
  const licence = v.licencePerYear * v.years;

  const totalCost = depreciation + financeCost + fuel + tyres + insurance + servicing + licence;
  return {
    years: v.years,
    totalKm,
    resaleValue,
    depreciation,
    financeCost,
    fuel,
    insurance,
    servicing,
    tyres,
    licence,
    totalCost,
    costPerMonth: roundCents(totalCost / months),
    costPerKm: totalKm > 0 ? roundCents(totalCost / totalKm) : null,
    monthlyRunningCost: roundCents((fuel + tyres + insurance + servicing + licence) / months),
    monthlyFinancePayment: finance?.monthlyPayment ?? 0,
    finance,
  };
}

export const compareInputSchema = z.object({
  years: z.number().int().min(1).max(15).default(5),
  cars: z
    .array(tcoCarSchema.extend({ name: z.string().trim().min(1) }))
    .min(1)
    .max(3),
});
export type CompareInput = z.input<typeof compareInputSchema>;

export interface CarComparison {
  name: string;
  result: TcoResult;
  /** Total cost above the cheapest car. 0 for the cheapest. */
  extraVsCheapest: Cents;
}

export interface ComparisonResult {
  cars: CarComparison[];
  /** Index of the car with the lowest total cost. The first one wins a tie. */
  cheapestIndex: number;
}

/** Compares up to three cars over the same ownership period. */
export function compareCars(input: CompareInput): ComparisonResult {
  const v = compareInputSchema.parse(input);
  const results = v.cars.map(({ name, ...car }) => ({
    name,
    result: calculateTCO({ ...car, years: v.years }),
  }));
  const totals = results.map((item) => item.result.totalCost);
  const cheapest = Math.min(...totals);
  const cheapestIndex = totals.indexOf(cheapest);
  return {
    cars: results.map((item) => ({ ...item, extraVsCheapest: item.result.totalCost - cheapest })),
    cheapestIndex,
  };
}
