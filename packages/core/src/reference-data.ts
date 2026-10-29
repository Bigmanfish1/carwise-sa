import { z } from 'zod';

/**
 * Envelope shared by every file in `data/`. A figure is only trustworthy once `verified` is true,
 * and it always carries its source and effective date.
 */
export function referenceDataSchema<V extends z.ZodType>(values: V) {
  return z.object({
    id: z.string().min(1),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    source: z.string().min(1),
    verified: z.boolean(),
    notes: z.string().optional(),
    values,
  });
}

export const PROVINCES = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'] as const;
export type Province = (typeof PROVINCES)[number];

export const PROVINCE_NAMES: Record<Province, string> = {
  EC: 'Eastern Cape',
  FS: 'Free State',
  GP: 'Gauteng',
  KZN: 'KwaZulu-Natal',
  LP: 'Limpopo',
  MP: 'Mpumalanga',
  NC: 'Northern Cape',
  NW: 'North West',
  WC: 'Western Cape',
};

const cents = z.number().int().nonnegative();

const fuelZoneSchema = z.object({ petrol95: cents, diesel50: cents });

export const fuelPricesSchema = referenceDataSchema(
  z.object({
    unit: z.string(),
    inland: fuelZoneSchema,
    coastal: fuelZoneSchema,
  }),
);
export type FuelPrices = z.infer<typeof fuelPricesSchema>;

const licenceBandSchema = z.object({
  /** Upper tare mass of the band in kg, inclusive. null means no upper limit. */
  maxTareKg: z.number().int().positive().nullable(),
  fee: cents,
});

export const licenceFeesSchema = referenceDataSchema(
  z.object({
    unit: z.string(),
    provinces: z.record(
      z.enum(PROVINCES),
      z.object({ bands: z.array(licenceBandSchema).min(1) }).superRefine(({ bands }, ctx) => {
        const limits = bands.map((b) => b.maxTareKg);
        const last = limits.at(-1);
        const finite = limits.slice(0, -1) as (number | null)[];
        const ascending = finite.every(
          (limit, i) => limit !== null && (i === 0 || limit > (finite[i - 1] as number)),
        );
        if (last !== null || !ascending) {
          ctx.addIssue({
            code: 'custom',
            message: 'Bands must ascend by maxTareKg and end with an unbounded (null) band',
          });
        }
      }),
    ),
  }),
);
export type LicenceFees = z.infer<typeof licenceFeesSchema>;
