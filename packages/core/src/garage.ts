import { z } from 'zod';
import type { Cents } from './money';
import { planNextService } from './service';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Not a valid date');

export const LOG_KINDS = ['service', 'repair', 'part', 'tyres', 'other'] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const LOG_KIND_LABELS: Record<LogKind, string> = {
  service: 'Service',
  repair: 'Repair',
  part: 'Part',
  tyres: 'Tyres',
  other: 'Other',
};

/** The user's car and the dates and distances that drive the reminders. */
export const carProfileSchema = z.object({
  name: z.string().trim().min(1, 'Give the car a name'),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  registration: z.string().trim().optional(),
  odometerKm: z.number().min(0),
  /** Average distance per month, used to predict when a km limit is reached. */
  avgKmPerMonth: z.number().min(0).default(0),
  licenceDiscExpiry: isoDate.optional(),
  servicePlanExpiryDate: isoDate.optional(),
  servicePlanExpiryKm: z.number().positive().optional(),
  serviceIntervalKm: z.number().positive().optional(),
  serviceIntervalMonths: z.number().int().positive().optional(),
});
export type CarProfile = z.infer<typeof carProfileSchema>;
export type CarProfileInput = z.input<typeof carProfileSchema>;

export const logEntrySchema = z.object({
  id: z.string().min(1),
  date: isoDate,
  kind: z.enum(LOG_KINDS),
  description: z.string().trim().min(1, 'Describe what was done'),
  cost: z.number().int().nonnegative().default(0),
  odometerKm: z.number().min(0).optional(),
  notes: z.string().optional(),
});
export type LogEntry = z.infer<typeof logEntrySchema>;
export type LogEntryInput = z.input<typeof logEntrySchema>;

export const GARAGE_VERSION = 1;

export const garageSchema = z.object({
  version: z.literal(GARAGE_VERSION),
  car: carProfileSchema.nullable(),
  entries: z.array(logEntrySchema).default([]),
});
export type Garage = z.infer<typeof garageSchema>;

export function emptyGarage(): Garage {
  return { version: GARAGE_VERSION, car: null, entries: [] };
}

export function setCar(garage: Garage, car: CarProfileInput): Garage {
  return { ...garage, car: carProfileSchema.parse(car) };
}

/** Adds an entry. The caller supplies the id, which keeps this function pure. */
export function addEntry(garage: Garage, entry: LogEntryInput): Garage {
  return { ...garage, entries: [...garage.entries, logEntrySchema.parse(entry)] };
}

export function removeEntry(garage: Garage, id: string): Garage {
  return { ...garage, entries: garage.entries.filter((entry) => entry.id !== id) };
}

/** Newest first, with the entry added last winning a tie on date. */
export function sortedEntries(garage: Garage): LogEntry[] {
  return garage.entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
    .map(({ entry }) => entry);
}

/** The file written by "Export my data". Everything stays on the user's device. */
export function exportGarage(garage: Garage): string {
  return JSON.stringify({ app: 'carwise-sa', ...garage }, null, 2);
}

export type ImportResult = { ok: true; garage: Garage } | { ok: false; error: string };

/** Validates text from an exported file. Nothing is applied until the caller accepts the result. */
export function importGarage(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'version' in raw &&
    raw.version !== GARAGE_VERSION
  ) {
    return { ok: false, error: 'This file was made by a different version of Carwise SA.' };
  }
  const parsed = garageSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join('.') || 'file';
    return {
      ok: false,
      error: `This file is not a Carwise SA export (${where}: ${issue?.message}).`,
    };
  }
  return { ok: true, garage: parsed.data };
}

export interface SpendSummary {
  total: Cents;
  byKind: Record<LogKind, Cents>;
}

/** Totals the money spent, optionally for one calendar year. */
export function summariseSpend(garage: Garage, year?: number): SpendSummary {
  const byKind = Object.fromEntries(LOG_KINDS.map((kind) => [kind, 0])) as Record<LogKind, Cents>;
  for (const entry of garage.entries) {
    if (year !== undefined && !entry.date.startsWith(`${year}-`)) continue;
    byKind[entry.kind] += entry.cost;
  }
  return { total: LOG_KINDS.reduce((sum, kind) => sum + byKind[kind], 0), byKind };
}

export type ReminderStatus = 'overdue' | 'soon' | 'ok' | 'unknown';

export interface Reminder {
  id: 'licence-disc' | 'service-plan' | 'next-service';
  label: string;
  status: ReminderStatus;
  detail: string;
  dueDate: string | null;
  daysRemaining: number | null;
  kmRemaining: number | null;
}

/** A reminder turns "soon" within this many days. */
export const SOON_DAYS = 30;
/** A reminder turns "soon" within this many km. */
export const SOON_KM = 1000;

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

function statusFor(daysRemaining: number | null, kmRemaining: number | null): ReminderStatus {
  if ((daysRemaining !== null && daysRemaining < 0) || (kmRemaining !== null && kmRemaining <= 0)) {
    return 'overdue';
  }
  if (
    (daysRemaining !== null && daysRemaining <= SOON_DAYS) ||
    (kmRemaining !== null && kmRemaining <= SOON_KM)
  ) {
    return 'soon';
  }
  return 'ok';
}

const ORDER: Record<ReminderStatus, number> = { overdue: 0, soon: 1, ok: 2, unknown: 3 };

function describe(daysRemaining: number | null, kmRemaining: number | null): string {
  const parts: string[] = [];
  if (daysRemaining !== null) {
    parts.push(
      daysRemaining < 0
        ? `${-daysRemaining} days ago`
        : daysRemaining === 0
          ? 'today'
          : `in ${daysRemaining} days`,
    );
  }
  if (kmRemaining !== null) {
    parts.push(kmRemaining <= 0 ? `${-kmRemaining} km over` : `${kmRemaining} km left`);
  }
  return parts.join(', ');
}

/** Expiry and service reminders from the car profile and the log. `today` is YYYY-MM-DD. */
export function computeReminders(garage: Garage, today: string): Reminder[] {
  const car = garage.car;
  if (!car) return [];
  const reminders: Reminder[] = [];

  if (car.licenceDiscExpiry) {
    const days = daysBetween(today, car.licenceDiscExpiry);
    reminders.push({
      id: 'licence-disc',
      label: 'Licence disc',
      status: statusFor(days, null),
      detail: `Expires ${describe(days, null)}`,
      dueDate: car.licenceDiscExpiry,
      daysRemaining: days,
      kmRemaining: null,
    });
  }

  if (car.servicePlanExpiryDate || car.servicePlanExpiryKm) {
    const days = car.servicePlanExpiryDate ? daysBetween(today, car.servicePlanExpiryDate) : null;
    const km = car.servicePlanExpiryKm ? car.servicePlanExpiryKm - car.odometerKm : null;
    reminders.push({
      id: 'service-plan',
      label: 'Service plan',
      status: statusFor(days, km),
      detail: `Ends ${describe(days, km)}`,
      dueDate: car.servicePlanExpiryDate ?? null,
      daysRemaining: days,
      kmRemaining: km,
    });
  }

  if (car.serviceIntervalKm || car.serviceIntervalMonths) {
    const last = sortedEntries(garage).find((entry) => entry.kind === 'service');
    const useKm = car.serviceIntervalKm !== undefined && last?.odometerKm !== undefined;
    const intervalKm = useKm ? car.serviceIntervalKm : undefined;
    if (!last || (intervalKm === undefined && car.serviceIntervalMonths === undefined)) {
      reminders.push({
        id: 'next-service',
        label: 'Next service',
        status: 'unknown',
        detail: last
          ? 'Add the odometer reading to your last service, or set a time interval.'
          : 'Log your last service to get a prediction.',
        dueDate: null,
        daysRemaining: null,
        kmRemaining: null,
      });
    } else {
      const lastKm = last.odometerKm ?? 0;
      const plan = planNextService({
        currentKm: Math.max(car.odometerKm, lastKm),
        lastServiceKm: lastKm,
        lastServiceDate: last.date,
        intervalKm,
        intervalMonths: car.serviceIntervalMonths,
        avgKmPerMonth: car.avgKmPerMonth,
        today,
      });
      const km = intervalKm === undefined ? null : plan.kmRemaining;
      reminders.push({
        id: 'next-service',
        label: 'Next service',
        status: statusFor(plan.daysRemaining, km),
        detail: `Due ${describe(plan.daysRemaining, km)}`,
        dueDate: plan.nextDueDate,
        daysRemaining: plan.daysRemaining,
        kmRemaining: km,
      });
    }
  }

  return reminders.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}
