import { describe, expect, it } from 'vitest';
import { centsToRands, formatZar, randsToCents, roundCents, sumCents } from './money';

describe('randsToCents', () => {
  it('converts whole and fractional rands', () => {
    expect(randsToCents(1)).toBe(100);
    expect(randsToCents(199.99)).toBe(19999);
    expect(randsToCents(0)).toBe(0);
  });

  it('avoids float artefacts', () => {
    expect(randsToCents(1.005)).toBe(101);
    expect(randsToCents(0.1 + 0.2)).toBe(30);
  });

  it('rejects non-finite input', () => {
    expect(() => randsToCents(Number.NaN)).toThrow(RangeError);
    expect(() => randsToCents(Infinity)).toThrow(RangeError);
  });
});

describe('roundCents', () => {
  it('rounds half away from zero', () => {
    expect(roundCents(2.5)).toBe(3);
    expect(roundCents(-2.5)).toBe(-3);
    expect(roundCents(2.4)).toBe(2);
  });

  it('never returns negative zero', () => {
    expect(Object.is(roundCents(-0.2), 0)).toBe(true);
  });

  it('rejects non-finite input', () => {
    expect(() => roundCents(Number.NaN)).toThrow(RangeError);
  });
});

describe('centsToRands', () => {
  it('converts cents to rands', () => {
    expect(centsToRands(12345)).toBe(123.45);
  });
});

describe('sumCents', () => {
  it('sums values and handles empty input', () => {
    expect(sumCents([100, 250, 5])).toBe(355);
    expect(sumCents([])).toBe(0);
  });
});

describe('formatZar', () => {
  it('formats as ZAR currency', () => {
    const text = formatZar(123456).replace(/\s/g, ' ');
    expect(text).toContain('R');
    expect(text).toContain('1');
    expect(text).toMatch(/234[,.]56$/);
  });
});
