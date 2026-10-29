import { z } from 'zod';
import type { Cents } from './money';
import { PROVINCES, type LicenceFees } from './reference-data';

export const licenceInputSchema = z.object({
  province: z.enum(PROVINCES),
  /** Tare mass of the vehicle in kg (see the licence disc or registration papers). */
  tareKg: z.number().int().positive(),
});
export type LicenceInput = z.input<typeof licenceInputSchema>;

export interface LicenceResult {
  fee: Cents;
  /** Upper limit of the band that applied, or null for the top band. */
  bandMaxTareKg: number | null;
}

/** Estimates the annual licence disc renewal fee from the province's tare mass bands. */
export function estimateLicenceFee(data: LicenceFees, input: LicenceInput): LicenceResult {
  const v = licenceInputSchema.parse(input);
  const bands = data.values.provinces[v.province].bands;
  const band = bands.find((b) => b.maxTareKg === null || v.tareKg <= b.maxTareKg) as
    (typeof bands)[number] | undefined;
  if (!band) throw new Error(`No licence fee band for ${v.province}`);
  return { fee: band.fee, bandMaxTareKg: band.maxTareKg };
}
