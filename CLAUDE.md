# Carwise SA: project brief

## What this is

Carwise SA is a free, open-source web app that guides South Africans through every phase of owning a car, from deciding what they can afford to selling it. It gives them clear explanations and honest calculators. Think of it as "TaxTim, but for your car": plain language, step by step, and specific to South Africa.

## Hard constraints (do not break these)

- **No user accounts, backend database, or collection of personal data.** All user inputs stay in the browser, using localStorage with JSON export and import. The app must never send a user's data to a server.
- **No analytics or tracking scripts** that capture personal information.
- **No secrets in the repo.** There are no API keys in the code or in `.env` files committed to git.
- **No AI or ML features** in the core product. The app is deterministic calculators plus content.
- **Every reference figure comes with its source and an effective date.** Calculators show "last updated" and a source link next to any official figure.
- **Results are estimates, not financial advice.** Show a short disclaimer on every calculator.

## Tech stack

- pnpm workspaces monorepo
  - `packages/core`: pure TypeScript calculation engine with no framework dependencies. Every function is pure, typed and unit-tested.
  - `apps/web`: Next.js (App Router) + TypeScript + Tailwind CSS. This is the UI, and it imports `@carwise/core`.
  - `data/`: versioned JSON reference data (see below), validated with Zod schemas in core.
  - `content/`: MDX guides for each ownership phase.
- Testing: Vitest for core (aim for 90%+ coverage on core), React Testing Library for components, and Playwright for end-to-end tests (added later).
- Tooling: ESLint, Prettier, TypeScript strict mode, and Husky with lint-staged.
- CI: GitHub Actions running lint, typecheck, test and build on every push and pull request.
- License: MIT.

## Code conventions

- Money is stored as **integer cents**, never floats. Format it with `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`.
- Rates are decimals: 0.115 means 11.5%.
- Each calculator in core exports `calculateX(input): XResult`, plus a Zod input schema and a test file with worked examples.
- Keep calculators small and composable. The total cost of ownership calculator combines the others.
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.

## Reference data format (`data/*.json`)

```json
{
  "id": "fuel-prices",
  "effectiveDate": "YYYY-MM-DD",
  "source": "TODO: official URL",
  "verified": false,
  "values": {}
}
```

## Ownership phases (the product's structure)

1. **Plan:** affordability, new vs used, and comparing the total cost of ownership of up to three cars.
2. **Buy:** vehicle finance, cash vs finance, trade-in, on-the-road costs, and a buying checklist (including the roadworthy certificate and registration for used cars).
3. **Insure:** comprehensive vs third-party cover explained, comparing the user's own quotes, and the impact of the excess.
4. **Run:** fuel, licence disc renewal, servicing schedule, service and maintenance plan expiry, tyres, a parts and repairs log, tolls and parking, and a business-travel logbook with SARS travel allowance info.
5. **Sell / upgrade:** depreciation estimate, settlement vs market value (negative equity), private sale vs trade-in, and change-of-ownership steps.
