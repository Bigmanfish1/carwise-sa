# Roadmap

## Milestone 0: Foundation (do now)

- [ ] pnpm monorepo with `packages/core`, `apps/web`, `data/` and `content/`
- [ ] TypeScript strict mode, ESLint, Prettier, Husky with lint-staged, and Vitest set up in core
- [ ] Next.js app with Tailwind, a landing page, and a page listing the 5 ownership phases
- [ ] GitHub Actions CI (lint, typecheck, test, build)
- [ ] README (pitch, screenshots placeholder, local setup, contributing), MIT LICENSE, `.gitignore`, `.editorconfig`
- [ ] Money utilities in core (cents, formatting, rounding) with tests

## Milestone 1: Vehicle finance calculator (do now)

- [ ] `calculateFinance` in core. Inputs: price, deposit, trade-in, interest rate, term in months, balloon %, initiation fee (financed or upfront), monthly service fee
  - Monthly instalment with a balloon payment (payments in arrears):
    `PMT = (P − B / (1+r)^n) × r / (1 − (1+r)^−n)`, where P is the principal financed, B the balloon amount, r the annual rate / 12, and n the term in months
  - Handle r = 0 as a separate case
  - Outputs: instalment, total paid, total interest, balloon amount, and the effective cost of credit
- [ ] Amortisation schedule (month, opening balance, interest, capital, closing balance)
- [ ] Tests with hand-checked worked examples, edge cases (0% rate, 0 deposit, balloon = 0) and input validation
- [ ] `/buy/finance` page: form, results card, amortisation table, and a chart of the balance over time
- [ ] Comparison: the same car with and without a balloon payment

## Milestone 2: Running costs

- [ ] Fuel cost calculator (km per month, L/100km, fuel price, inland/coastal zone from `data/fuel-prices.json`)
- [ ] Licence disc renewal estimate by province (`data/licence-fees.json`, which depends on tare mass)
- [ ] Service schedule planner (interval in km or months, next-service prediction from average km)
- [ ] Tyre replacement estimator

## Milestone 3: Total cost of ownership and comparison

- [ ] `calculateTCO`, which combines finance, fuel, insurance (user-entered), servicing, tyres, licence and depreciation over N years
- [ ] Compare up to 3 cars side by side, with cost per km and cost per month
- [ ] Affordability check (car costs as a share of take-home pay, with a configurable threshold)

## Milestone 4: Garage (local-first)

- [ ] "My car" profile stored in localStorage (no account)
- [ ] Parts and repairs log, service history, and expiry reminders (service plan, licence disc)
- [ ] JSON export and import, plus "delete all my data"

## Milestone 5: Sell / upgrade

- [ ] Depreciation curve estimator (configurable yearly rates)
- [ ] Settlement vs market value, negative-equity warning, and upgrade-cost scenarios
- [ ] Change-of-ownership checklist (roadworthy certificate, NCO form, settlement letter)

## Milestone 6: Tax and business use

- [ ] Business-travel logbook (trips, purpose, odometer) with CSV export
- [ ] Explainer on the SARS travel allowance and the deemed cost table (`data/sars-travel.json`, updated each tax year)

## Milestone 7: Content and polish

- [ ] MDX guide per phase (plain-language, South Africa specific, with linked sources)
- [ ] Glossary (balloon payment, residual, excess, roadworthy, NCO, prime rate…)
- [ ] Accessibility pass, mobile layout, dark mode
- [ ] Playwright end-to-end tests for each calculator
- [ ] Deploy (Vercel or Cloudflare Pages)

## Ongoing backlog ideas

- Lease vs buy comparison
- Electric vs petrol cost comparison
- Insurance quote comparison table
- Shareable result links (inputs encoded in the URL, no server)
- Printable PDF summary of the cost breakdown
