import { formatZar, type AmortisationRow } from '@carwise/core';

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 12 };

/** Outstanding balance after each month, as a dependency-free SVG line chart. */
export function BalanceChart({
  schedule,
  principal,
}: {
  schedule: readonly AmortisationRow[];
  principal: number;
}) {
  const months = schedule.length;
  const max = Math.max(principal, 1);
  const x = (month: number) =>
    PAD.left + (month / Math.max(months, 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (balance: number) => PAD.top + (1 - balance / max) * (HEIGHT - PAD.top - PAD.bottom);

  const points = [
    { month: 0, balance: principal },
    ...schedule.map((row) => ({ month: row.month, balance: row.closingBalance })),
  ];
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.month).toFixed(1)},${y(p.balance).toFixed(1)}`)
    .join(' ');
  const baseline = HEIGHT - PAD.bottom;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Outstanding balance falls from ${formatZar(principal)} to ${formatZar(
          schedule.at(-1)?.closingBalance ?? 0,
        )} over ${months} months`}
        className="w-full"
      >
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={baseline}
          y2={baseline}
          className="stroke-slate-300"
        />
        <path d={path} fill="none" strokeWidth={2.5} className="stroke-slate-900" />
        <text x={PAD.left} y={HEIGHT - 8} className="fill-slate-500 text-[11px]">
          Month 0
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 8}
          textAnchor="end"
          className="fill-slate-500 text-[11px]"
        >
          Month {months}
        </text>
      </svg>
      <figcaption className="text-sm text-slate-500">
        Balance owing over time. It ends at the balloon amount, if there is one.
      </figcaption>
    </figure>
  );
}
