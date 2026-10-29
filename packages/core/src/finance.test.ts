import { describe, expect, it } from 'vitest';
import {
  buildAmortisationSchedule,
  calculateFinance,
  calculateInstalment,
  compareBalloon,
  financeInputSchema,
} from './finance';

const R = (rands: number) => rands * 100;

describe('calculateInstalment', () => {
  it('divides evenly at 0% interest', () => {
    // (120 000 - 0) / 12 = 10 000
    expect(calculateInstalment(R(120000), 0, 0, 12)).toBeCloseTo(R(10000), 6);
  });

  it('handles a balloon at 0% interest', () => {
    // (120 000 - 30 000) / 12 = 7 500
    expect(calculateInstalment(R(120000), R(30000), 0, 12)).toBeCloseTo(R(7500), 6);
  });

  it('matches the standard annuity formula', () => {
    // 200 000 at 12% p.a. (1% a month) over 12 months: 2 000 / (1 - 1.01^-12) = 17 769.76
    expect(calculateInstalment(R(200000), 0, 0.12, 12) / 100).toBeCloseTo(17769.76, 2);
  });

  it('is interest-only when the balloon equals the principal', () => {
    // 100 000 at 12% p.a., balloon 100 000: pays 1% a month = 1 000
    expect(calculateInstalment(R(100000), R(100000), 0.12, 60)).toBeCloseTo(R(1000), 6);
  });
});

describe('calculateFinance', () => {
  it('computes a zero-interest loan exactly', () => {
    const result = calculateFinance({ price: R(120000), annualRate: 0, termMonths: 12 });
    expect(result.principal).toBe(R(120000));
    expect(result.monthlyInstalment).toBe(R(10000));
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(R(120000));
    expect(result.effectiveAnnualRate).toBe(0);
    expect(result.schedule).toHaveLength(12);
    expect(result.schedule[11]?.closingBalance).toBe(0);
  });

  it('handles a 12 month loan with no deposit and no balloon', () => {
    const result = calculateFinance({ price: R(200000), annualRate: 0.12, termMonths: 12 });
    expect(result.monthlyInstalment).toBe(1776976);
    expect(result.balloonAmount).toBe(0);
    // Total of instalments minus principal is the interest, to within the final-month rounding.
    expect(result.totalInterest).toBe(result.totalPaid - result.principal);
    // 12 x 17 769.76 - 200 000 = 13 237.12
    expect(result.totalInterest / 100).toBeCloseTo(13237.12, 0);
    // Compounded monthly: effective annual rate is 1.01^12 - 1 = 12.6825%
    expect(result.effectiveAnnualRate).toBeCloseTo(0.126825, 5);
  });

  it('subtracts deposit and trade-in from the amount financed', () => {
    const result = calculateFinance({
      price: R(300000),
      deposit: R(30000),
      tradeIn: R(70000),
      annualRate: 0,
      termMonths: 10,
    });
    expect(result.principal).toBe(R(200000));
    expect(result.monthlyInstalment).toBe(R(20000));
    expect(result.upfrontCosts).toBe(R(30000));
    expect(result.totalPaid).toBe(R(300000));
  });

  it('charges interest only when the balloon equals the amount financed', () => {
    const result = calculateFinance({
      price: R(100000),
      annualRate: 0.12,
      termMonths: 60,
      balloonPercent: 1,
    });
    expect(result.balloonAmount).toBe(R(100000));
    expect(result.monthlyInstalment).toBe(R(1000));
    expect(result.totalInterest).toBe(R(60000));
    expect(result.schedule.at(-1)?.closingBalance).toBe(R(100000));
  });

  it('ends the schedule on the balloon amount', () => {
    const result = calculateFinance({
      price: R(350000),
      deposit: R(35000),
      annualRate: 0.115,
      termMonths: 72,
      balloonPercent: 0.3,
    });
    expect(result.balloonAmount).toBe(R(105000));
    expect(result.schedule).toHaveLength(72);
    expect(result.schedule.at(-1)?.closingBalance).toBe(R(105000));
    const instalments = result.schedule.reduce((sum, row) => sum + row.payment, 0);
    expect(result.totalPaid).toBe(result.upfrontCosts + instalments + result.balloonAmount);
  });

  it('treats a financed initiation fee as part of the principal', () => {
    const result = calculateFinance({
      price: R(100000),
      annualRate: 0,
      termMonths: 10,
      initiationFee: R(1000),
      initiationFeeFinanced: true,
    });
    expect(result.principal).toBe(R(101000));
    expect(result.monthlyInstalment).toBe(R(10100));
    expect(result.upfrontCosts).toBe(0);
    expect(result.totalCostOfCredit).toBe(R(1000));
  });

  it('treats an upfront initiation fee as a cash cost', () => {
    const result = calculateFinance({
      price: R(100000),
      deposit: R(10000),
      annualRate: 0,
      termMonths: 10,
      initiationFee: R(1000),
    });
    expect(result.principal).toBe(R(90000));
    expect(result.upfrontCosts).toBe(R(11000));
    expect(result.totalPaid).toBe(R(101000));
  });

  it('adds the monthly service fee to the payment and to the cost of credit', () => {
    const result = calculateFinance({
      price: R(60000),
      annualRate: 0,
      termMonths: 12,
      monthlyServiceFee: R(69),
    });
    expect(result.monthlyInstalment).toBe(R(5000));
    expect(result.monthlyPayment).toBe(R(5069));
    expect(result.totalServiceFees).toBe(R(828));
    expect(result.totalCostOfCredit).toBe(R(828));
    expect(result.totalPaid).toBe(R(60828));
    expect(result.effectiveAnnualRate).toBeGreaterThan(0);
  });

  it('puts the effective rate above the nominal rate when fees apply', () => {
    const result = calculateFinance({
      price: R(250000),
      annualRate: 0.1,
      termMonths: 60,
      initiationFee: R(1207),
      monthlyServiceFee: R(69),
    });
    expect(result.effectiveAnnualRate).toBeGreaterThan(Math.pow(1 + 0.1 / 12, 12) - 1);
  });

  it('handles a fully paid-up purchase', () => {
    const result = calculateFinance({
      price: R(80000),
      deposit: R(50000),
      tradeIn: R(30000),
      annualRate: 0.1,
      termMonths: 24,
    });
    expect(result.principal).toBe(0);
    expect(result.monthlyInstalment).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.effectiveAnnualRate).toBe(0);
  });

  it('keeps the schedule internally consistent', () => {
    const result = calculateFinance({
      price: R(275500),
      deposit: R(20000),
      annualRate: 0.1375,
      termMonths: 60,
      balloonPercent: 0.25,
    });
    let balance = result.principal;
    for (const row of result.schedule) {
      expect(row.openingBalance).toBe(balance);
      expect(row.payment).toBe(row.interest + row.capital);
      expect(row.closingBalance).toBe(row.openingBalance - row.capital);
      balance = row.closingBalance;
    }
    expect(balance).toBe(result.balloonAmount);
  });
});

describe('buildAmortisationSchedule', () => {
  it('splits a simple first month correctly', () => {
    const [first] = buildAmortisationSchedule(R(100000), 0, 0.12, 12, 888488);
    // 100 000 at 1% a month: interest 1 000.00, capital 7 884.88
    expect(first?.interest).toBe(R(1000));
    expect(first?.capital).toBe(788488);
    expect(first?.closingBalance).toBe(R(100000) - 788488);
  });
});

describe('compareBalloon', () => {
  it('shows a lower monthly payment but a higher total cost with a balloon', () => {
    const comparison = compareBalloon({
      price: R(300000),
      deposit: R(30000),
      annualRate: 0.12,
      termMonths: 60,
      balloonPercent: 0.3,
    });
    expect(comparison.withoutBalloon.balloonAmount).toBe(0);
    expect(comparison.monthlySaving).toBeGreaterThan(0);
    expect(comparison.extraCostOfBalloon).toBeGreaterThan(0);
  });

  it('shows no difference when the balloon is zero', () => {
    const comparison = compareBalloon({ price: R(100000), annualRate: 0.1, termMonths: 36 });
    expect(comparison.monthlySaving).toBe(0);
    expect(comparison.extraCostOfBalloon).toBe(0);
  });
});

describe('input validation', () => {
  const base = { price: R(100000), annualRate: 0.1, termMonths: 60 };

  it('accepts a minimal valid input and applies defaults', () => {
    const parsed = financeInputSchema.parse(base);
    expect(parsed.deposit).toBe(0);
    expect(parsed.balloonPercent).toBe(0);
    expect(parsed.initiationFeeFinanced).toBe(false);
  });

  it.each([
    ['zero price', { ...base, price: 0 }],
    ['fractional cents', { ...base, price: 1000.5 }],
    ['negative deposit', { ...base, deposit: -1 }],
    ['negative rate', { ...base, annualRate: -0.01 }],
    ['rate above 100%', { ...base, annualRate: 1.5 }],
    ['zero term', { ...base, termMonths: 0 }],
    ['fractional term', { ...base, termMonths: 12.5 }],
    ['term over 120 months', { ...base, termMonths: 121 }],
    ['balloon above 100%', { ...base, balloonPercent: 1.1 }],
    ['deposit plus trade-in above price', { ...base, deposit: R(60000), tradeIn: R(50000) }],
    ['balloon above amount financed', { ...base, deposit: R(80000), balloonPercent: 0.5 }],
  ])('rejects %s', (_label, input) => {
    expect(() => calculateFinance(input)).toThrow();
  });
});
