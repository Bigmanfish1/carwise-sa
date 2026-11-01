export interface Phase {
  slug: string;
  name: string;
  summary: string;
  tools?: readonly { href: string; label: string }[];
}

export const PHASES: readonly Phase[] = [
  {
    slug: 'plan',
    name: 'Plan',
    summary:
      'Work out what you can afford, decide between new and used, and compare the total cost of up to three cars.',
    tools: [
      { href: '/plan/affordability', label: 'Can I afford this car?' },
      { href: '/plan/compare', label: 'Compare the total cost of up to 3 cars' },
    ],
  },
  {
    slug: 'buy',
    name: 'Buy',
    summary:
      'Vehicle finance, cash vs finance, trade-ins, on-the-road costs and a buying checklist.',
    tools: [{ href: '/buy/finance', label: 'Vehicle finance calculator' }],
  },
  {
    slug: 'insure',
    name: 'Insure',
    summary:
      'Comprehensive vs third-party cover, comparing your own quotes, and what the excess really costs you.',
  },
  {
    slug: 'run',
    name: 'Run',
    summary:
      'Fuel, licence disc renewal, servicing, tyres, repairs, tolls and a business-travel logbook.',
    tools: [
      { href: '/garage', label: 'My garage: log and reminders' },
      { href: '/run/fuel', label: 'Fuel cost calculator' },
      { href: '/run/licence', label: 'Licence disc renewal estimate' },
      { href: '/run/service', label: 'Service schedule planner' },
      { href: '/run/tyres', label: 'Tyre replacement estimator' },
    ],
  },
  {
    slug: 'sell',
    name: 'Sell / upgrade',
    summary:
      'Depreciation, settlement vs market value, private sale vs trade-in, and change-of-ownership steps.',
  },
];
