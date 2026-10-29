# Carwise SA

Free, open-source guide and calculators for owning a car in South Africa, from deciding what you
can afford to selling it. Think "TaxTim, but for your car": plain language, step by step, and
specific to South Africa.

> Results are estimates, not financial advice.

## Principles

- No accounts, no backend database, no personal data collected. Everything stays in your browser.
- No analytics or tracking scripts.
- Every official figure carries its source and an effective date.
- Deterministic calculators and content only. No AI features in the core product.

## Ownership phases

1. **Plan**: affordability, new vs used, total cost of ownership.
2. **Buy**: finance, cash vs finance, trade-in, buying checklist.
3. **Insure**: cover types, comparing quotes, excess impact.
4. **Run**: fuel, licence disc, servicing, tyres, repairs, logbook.
5. **Sell / upgrade**: depreciation, settlement vs market value, change of ownership.

See [docs/ROADMAP.md](docs/ROADMAP.md) for what is built and what is next.

## Screenshots

_Coming soon._

## Local setup

Requires Node.js 22+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev          # run the web app on http://localhost:3000
pnpm test         # unit tests (core)
pnpm lint
pnpm typecheck
pnpm build
```

## Repository layout

- `packages/core`: pure TypeScript calculation engine (`@carwise/core`)
- `apps/web`: Next.js UI
- `data/`: versioned JSON reference data (each file records its source and `verified` status)
- `content/`: MDX guides

## Contributing

Contributions are welcome. Please open an issue first for larger changes.

- Use [conventional commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, ...).
- Money is integer cents; rates are decimals (0.115 = 11.5%).
- Every calculator needs tests with worked examples.
- Reference figures must include a source URL and effective date. Unverified figures must be
  marked `"verified": false`.
- Run `pnpm lint && pnpm typecheck && pnpm test` before opening a pull request.

## License

[MIT](LICENSE)
