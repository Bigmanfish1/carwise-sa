import { z } from 'zod';
import { roundCents, type Cents } from './money';
import type { FuelPrices } from './reference-data';

export type FuelZone = 'inland' | 'coastal';
export type FuelType = 'petrol95' | 'diesel50';

export const fuelInputSchema = z.object({
  kmPerMonth: z.number().min(0),
  /** Consumption in litres per 100 km. */
  litresPer100km: z.number().positive(),
  /** Pump price in cents per litre. */
  pricePerLitre: z.number().int().nonnegative(),
});
export type FuelInput = z.input<typeof fuelInputSchema>;

export interface FuelResult {
  litresPerMonth: number;
  costPerMonth: Cents;
  costPerYear: Cents;
  /** Fuel cost per kilometre in cents. */
  costPerKm: Cents;
}

export function calculateFuelCost(input: FuelInput): FuelResult {
  const v = fuelInputSchema.parse(input);
  const litresPerMonth = (v.kmPerMonth * v.litresPer100km) / 100;
  return {
    litresPerMonth,
    costPerMonth: roundCents(litresPerMonth * v.pricePerLitre),
    costPerYear: roundCents(litresPerMonth * 12 * v.pricePerLitre),
    costPerKm: roundCents((v.litresPer100km / 100) * v.pricePerLitre),
  };
}

/** Looks up a pump price in cents per litre from the reference data. */
export function fuelPriceFor(data: FuelPrices, zone: FuelZone, fuelType: FuelType): Cents {
  return data.values[zone][fuelType];
}
