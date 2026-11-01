import { z } from 'zod';
import { roundCents, type Cents } from './money';

/**
 * A common rule of thumb, NOT an official or verified figure. Users can change it, and the UI
 * should say so wherever it is shown.
 */
export const DEFAULT_AFFORDABILITY_THRESHOLD = 0.2;

export const affordabilityInputSchema = z.object({
  /** Monthly pay after tax and deductions. */
  takeHomePay: z.number().int().positive(),
  /** Monthly cash cost of the car: finance payment plus running costs. */
  monthlyCarCost: z.number().int().nonnegative(),
  /** Largest acceptable share of take-home pay, as a decimal (0.2 = 20%). */
  threshold: z.number().gt(0).max(1).default(DEFAULT_AFFORDABILITY_THRESHOLD),
});
export type AffordabilityInput = z.input<typeof affordabilityInputSchema>;

export interface AffordabilityResult {
  /** Car cost as a share of take-home pay (decimal). */
  share: number;
  threshold: number;
  /** Highest monthly car cost that stays within the threshold. */
  maxMonthlyCost: Cents;
  /** Room left under the threshold. Negative when over it. */
  headroom: Cents;
  affordable: boolean;
}

export function checkAffordability(input: AffordabilityInput): AffordabilityResult {
  const v = affordabilityInputSchema.parse(input);
  const maxMonthlyCost = roundCents(v.takeHomePay * v.threshold);
  return {
    share: v.monthlyCarCost / v.takeHomePay,
    threshold: v.threshold,
    maxMonthlyCost,
    headroom: maxMonthlyCost - v.monthlyCarCost,
    affordable: v.monthlyCarCost <= maxMonthlyCost,
  };
}
