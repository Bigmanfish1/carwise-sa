import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const DAY_MS = 86_400_000;
const DAYS_PER_MONTH = 30.4375;

export const serviceInputSchema = z
  .object({
    currentKm: z.number().min(0),
    lastServiceKm: z.number().min(0),
    lastServiceDate: isoDate,
    /** Service interval in km, e.g. 15 000. Optional if a month interval is given. */
    intervalKm: z.number().positive().optional(),
    /** Service interval in months, e.g. 12. Optional if a km interval is given. */
    intervalMonths: z.number().int().positive().optional(),
    /** Average distance driven per month, used to predict when the km interval is reached. */
    avgKmPerMonth: z.number().min(0),
    /** Today's date. Passed in so the calculation stays pure. */
    today: isoDate,
  })
  .superRefine((v, ctx) => {
    if (v.intervalKm === undefined && v.intervalMonths === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Give a service interval in km, months, or both' });
    }
    if (v.currentKm < v.lastServiceKm) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentKm'],
        message: 'Current odometer cannot be below the odometer at the last service',
      });
    }
    for (const key of ['lastServiceDate', 'today'] as const) {
      if (Number.isNaN(Date.parse(v[key]))) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'Not a valid date' });
      }
    }
  });
export type ServiceInput = z.input<typeof serviceInputSchema>;

export interface ServiceResult {
  nextDueKm: number | null;
  kmRemaining: number | null;
  /** Date the month interval expires. */
  dueDateByMonths: string | null;
  /** Predicted date the km interval is reached at the average driving rate. */
  dueDateByKm: string | null;
  /** The earlier of the two dates. */
  nextDueDate: string | null;
  /** Which interval comes first. */
  dueBy: 'km' | 'months' | null;
  daysRemaining: number | null;
  overdue: boolean;
}

const toMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Adds calendar months, clamping to the end of a shorter month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const d = new Date(toMs(iso));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return toIso(d.getTime());
}

/** Predicts the next service from the km and/or month interval, whichever comes first. */
export function planNextService(input: ServiceInput): ServiceResult {
  const v = serviceInputSchema.parse(input);
  const todayMs = toMs(v.today);

  const nextDueKm = v.intervalKm === undefined ? null : v.lastServiceKm + v.intervalKm;
  const kmRemaining = nextDueKm === null ? null : nextDueKm - v.currentKm;

  const dueDateByMonths =
    v.intervalMonths === undefined ? null : addMonths(v.lastServiceDate, v.intervalMonths);

  let dueDateByKm: string | null = null;
  if (kmRemaining !== null) {
    if (kmRemaining <= 0) dueDateByKm = v.today;
    else if (v.avgKmPerMonth > 0) {
      const days = Math.ceil((kmRemaining / v.avgKmPerMonth) * DAYS_PER_MONTH);
      dueDateByKm = toIso(todayMs + days * DAY_MS);
    }
  }

  const candidates = [
    { date: dueDateByKm, by: 'km' as const },
    { date: dueDateByMonths, by: 'months' as const },
  ].filter((c): c is { date: string; by: 'km' | 'months' } => c.date !== null);
  const first = candidates.reduce<(typeof candidates)[number] | null>(
    (best, c) => (best === null || c.date < best.date ? c : best),
    null,
  );

  const daysRemaining = first === null ? null : Math.round((toMs(first.date) - todayMs) / DAY_MS);
  const overdue =
    (kmRemaining !== null && kmRemaining <= 0) ||
    (dueDateByMonths !== null && dueDateByMonths < v.today);

  return {
    nextDueKm,
    kmRemaining,
    dueDateByMonths,
    dueDateByKm,
    nextDueDate: first?.date ?? null,
    dueBy: first?.by ?? null,
    daysRemaining,
    overdue,
  };
}
