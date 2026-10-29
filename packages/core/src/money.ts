/** Money is stored as integer cents (ZAR). Never use floats for stored amounts. */
export type Cents = number;

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

/** Converts rands (e.g. user input) to integer cents, rounding half away from zero. */
export function randsToCents(rands: number): Cents {
  if (!Number.isFinite(rands)) throw new RangeError('Amount must be a finite number');
  return roundCents(rands * 100);
}

/** Converts integer cents to rands. For display or maths only, not for storage. */
export function centsToRands(cents: Cents): number {
  return cents / 100;
}

/** Rounds a fractional cent amount to whole cents, half away from zero. */
export function roundCents(cents: number): Cents {
  if (!Number.isFinite(cents)) throw new RangeError('Amount must be a finite number');
  const rounded = Math.sign(cents) * Math.round(Math.abs(cents) + Number.EPSILON * Math.abs(cents));
  return rounded === 0 ? 0 : rounded;
}

/** Formats integer cents as South African rand, e.g. "R 1 234,56" (locale dependent). */
export function formatZar(cents: Cents): string {
  return zar.format(centsToRands(cents));
}

/** Sums integer cent amounts. */
export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((total, value) => total + value, 0);
}
