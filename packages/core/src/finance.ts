import { z } from 'zod';
import { roundCents, type Cents } from './money';

const cents = z.number().int().nonnegative();

/**
 * Inputs for a vehicle finance calculation.
 * Money is integer cents, rates and percentages are decimals (0.115 = 11.5%).
 */
export const financeInputSchema = z
  .object({
    /** Cash price of the vehicle. */
    price: cents.refine((v) => v > 0, 'Price must be greater than zero'),
    deposit: cents.default(0),
    /** Value credited for a traded-in vehicle. */
    tradeIn: cents.default(0),
    /** Nominal annual interest rate, compounded monthly. */
    annualRate: z.number().min(0).max(1),
    termMonths: z.number().int().min(1).max(120),
    /** Balloon (residual) as a share of the cash price. */
    balloonPercent: z.number().min(0).max(1).default(0),
    initiationFee: cents.default(0),
    /** true: the initiation fee is added to the amount financed. false: paid upfront. */
    initiationFeeFinanced: z.boolean().default(false),
    /** Fee charged every month on top of the instalment. */
    monthlyServiceFee: cents.default(0),
  })
  .superRefine((input, ctx) => {
    if (input.deposit + input.tradeIn > input.price) {
      ctx.addIssue({
        code: 'custom',
        path: ['deposit'],
        message: 'Deposit plus trade-in cannot exceed the price',
      });
      return;
    }
    const financed =
      input.price -
      input.deposit -
      input.tradeIn +
      (input.initiationFeeFinanced ? input.initiationFee : 0);
    if (roundCents(input.price * input.balloonPercent) > financed) {
      ctx.addIssue({
        code: 'custom',
        path: ['balloonPercent'],
        message: 'Balloon cannot exceed the amount financed',
      });
    }
  });

export type FinanceInput = z.input<typeof financeInputSchema>;

export interface AmortisationRow {
  month: number;
  openingBalance: Cents;
  /** Instalment paid this month, excluding the monthly service fee. */
  payment: Cents;
  interest: Cents;
  capital: Cents;
  closingBalance: Cents;
}

export interface FinanceResult {
  /** Amount financed, including a financed initiation fee. */
  principal: Cents;
  balloonAmount: Cents;
  /** Monthly instalment excluding the service fee. */
  monthlyInstalment: Cents;
  monthlyServiceFee: Cents;
  /** Instalment plus service fee. */
  monthlyPayment: Cents;
  /** Deposit plus any initiation fee paid upfront (trade-in not included). */
  upfrontCosts: Cents;
  totalInterest: Cents;
  totalServiceFees: Cents;
  /** Interest, initiation fee and service fees. */
  totalCostOfCredit: Cents;
  /** Everything paid over the term: upfront costs, trade-in value, instalments, fees and balloon. */
  totalPaid: Cents;
  /**
   * Effective annual cost of credit (decimal): the annualised IRR of the cash flows, so initiation
   * and service fees are included. Always at or above the nominal rate.
   */
  effectiveAnnualRate: number;
  schedule: AmortisationRow[];
}

/**
 * Level payment (in arrears) that amortises `principal` down to `balloon` over `months`.
 * PMT = (P - B / (1+r)^n) * r / (1 - (1+r)^-n), with r the monthly rate.
 * Returns an unrounded value in cents.
 */
export function calculateInstalment(
  principal: Cents,
  balloon: Cents,
  annualRate: number,
  months: number,
): number {
  const r = annualRate / 12;
  if (r === 0) return (principal - balloon) / months;
  const growth = Math.pow(1 + r, months);
  return ((principal - balloon / growth) * r) / (1 - 1 / growth);
}

/**
 * Builds the month-by-month schedule. Interest is rounded to the cent each month and the final
 * instalment absorbs the rounding so the closing balance lands exactly on the balloon.
 */
export function buildAmortisationSchedule(
  principal: Cents,
  balloon: Cents,
  annualRate: number,
  months: number,
  instalment: Cents,
): AmortisationRow[] {
  const r = annualRate / 12;
  const rows: AmortisationRow[] = [];
  let balance = principal;
  for (let month = 1; month <= months; month++) {
    const interest = roundCents(balance * r);
    const isLast = month === months;
    const capital = isLast ? balance - balloon : instalment - interest;
    const closingBalance = balance - capital;
    rows.push({
      month,
      openingBalance: balance,
      payment: interest + capital,
      interest,
      capital,
      closingBalance,
    });
    balance = closingBalance;
  }
  return rows;
}

/** Monthly IRR of the cash flows by bisection; returns the annualised effective rate. */
function effectiveAnnualRate(advance: Cents, payments: readonly number[], balloon: Cents): number {
  const npv = (i: number): number => {
    let total = advance;
    for (let t = 1; t <= payments.length; t++) {
      total -= (payments[t - 1] as number) / Math.pow(1 + i, t);
    }
    return total - balloon / Math.pow(1 + i, payments.length);
  };
  if (npv(0) >= 0) return 0;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) hi = mid;
    else lo = mid;
  }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}

export function calculateFinance(input: FinanceInput): FinanceResult {
  const v = financeInputSchema.parse(input);

  const financedFee = v.initiationFeeFinanced ? v.initiationFee : 0;
  const upfrontFee = v.initiationFeeFinanced ? 0 : v.initiationFee;
  const vehicleFinanced = v.price - v.deposit - v.tradeIn;
  const principal = vehicleFinanced + financedFee;
  const balloonAmount = roundCents(v.price * v.balloonPercent);

  const monthlyInstalment = roundCents(
    calculateInstalment(principal, balloonAmount, v.annualRate, v.termMonths),
  );
  const schedule = buildAmortisationSchedule(
    principal,
    balloonAmount,
    v.annualRate,
    v.termMonths,
    monthlyInstalment,
  );

  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const totalInstalments = schedule.reduce((sum, row) => sum + row.payment, 0);
  const totalServiceFees = v.monthlyServiceFee * v.termMonths;
  const upfrontCosts = v.deposit + upfrontFee;

  const cashflows = schedule.map((row) => row.payment + v.monthlyServiceFee);

  return {
    principal,
    balloonAmount,
    monthlyInstalment,
    monthlyServiceFee: v.monthlyServiceFee,
    monthlyPayment: monthlyInstalment + v.monthlyServiceFee,
    upfrontCosts,
    totalInterest,
    totalServiceFees,
    totalCostOfCredit: totalInterest + v.initiationFee + totalServiceFees,
    totalPaid: upfrontCosts + v.tradeIn + totalInstalments + totalServiceFees + balloonAmount,
    effectiveAnnualRate: effectiveAnnualRate(
      vehicleFinanced - upfrontFee,
      cashflows,
      balloonAmount,
    ),
    schedule,
  };
}

export interface BalloonComparison {
  withBalloon: FinanceResult;
  withoutBalloon: FinanceResult;
  /** Positive when the balloon lowers the monthly payment. */
  monthlySaving: Cents;
  /** Positive when the balloon makes the whole deal cost more. */
  extraCostOfBalloon: Cents;
}

/** Compares the same car and terms with the given balloon against no balloon at all. */
export function compareBalloon(input: FinanceInput): BalloonComparison {
  const withBalloon = calculateFinance(input);
  const withoutBalloon = calculateFinance({ ...input, balloonPercent: 0 });
  return {
    withBalloon,
    withoutBalloon,
    monthlySaving: withoutBalloon.monthlyPayment - withBalloon.monthlyPayment,
    extraCostOfBalloon: withBalloon.totalCostOfCredit - withoutBalloon.totalCostOfCredit,
  };
}
