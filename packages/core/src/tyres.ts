import { z } from 'zod';
import { roundCents, type Cents } from './money';

const cents = z.number().int().nonnegative();

export const tyreInputSchema = z.object({
  /** Expected life of a set of tyres in km. */
  tyreLifeKm: z.number().positive(),
  kmPerMonth: z.number().min(0),
  /** Distance already covered on the current tyres. */
  kmOnCurrentTyres: z.number().min(0),
  pricePerTyre: cents,
  tyreCount: z.number().int().min(1).max(6).default(4),
  /** Fitting and balancing per tyre. */
  fittingPerTyre: cents.default(0),
  /** Wheel alignment, once per replacement. */
  alignment: cents.default(0),
});
export type TyreInput = z.input<typeof tyreInputSchema>;

export interface TyreResult {
  kmRemaining: number;
  /** null when the car is not being driven. */
  monthsRemaining: number | null;
  replacementCost: Cents;
  costPerKm: Cents;
  costPerMonth: Cents;
  due: boolean;
}

export function estimateTyreReplacement(input: TyreInput): TyreResult {
  const v = tyreInputSchema.parse(input);
  const replacementCost = v.tyreCount * (v.pricePerTyre + v.fittingPerTyre) + v.alignment;
  const kmRemaining = Math.max(0, v.tyreLifeKm - v.kmOnCurrentTyres);
  const perKm = replacementCost / v.tyreLifeKm;
  return {
    kmRemaining,
    monthsRemaining: v.kmPerMonth > 0 ? kmRemaining / v.kmPerMonth : null,
    replacementCost,
    costPerKm: roundCents(perKm),
    costPerMonth: roundCents(perKm * v.kmPerMonth),
    due: v.kmOnCurrentTyres >= v.tyreLifeKm,
  };
}
