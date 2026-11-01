import type { ReactNode } from 'react';

export function Field({
  label,
  value,
  onChange,
  suffix,
  step = 'any',
  type = 'number',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  step?: string;
  type?: 'number' | 'date' | 'text';
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          min={type === 'number' ? 0 : undefined}
          step={type === 'number' ? step : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
        />
        {suffix ? <span className="text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={strong ? 'text-2xl font-bold' : 'text-lg font-semibold'}>{value}</dd>
    </div>
  );
}

export function ErrorList({ errors }: { errors: readonly string[] }) {
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
      <p className="font-medium">Check your inputs:</p>
      <ul className="list-inside list-disc">
        {[...new Set(errors)].map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function CalculatorLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{intro}</p>
      </div>
      {children}
      <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        These results are estimates, not financial advice. Check prices and fees with the supplier
        or the licensing authority before you rely on them.
      </p>
    </section>
  );
}

/** Shows where an official figure came from, when it applies from, and whether it is verified. */
export function DataSource({
  data,
}: {
  data: { effectiveDate: string; source: string; verified: boolean; notes?: string | undefined };
}) {
  const isUrl = /^https?:\/\//.test(data.source);
  return (
    <div
      className={`rounded-md p-3 text-sm ${
        data.verified ? 'bg-slate-50 text-slate-600' : 'bg-red-50 text-red-900'
      }`}
    >
      <p>
        <strong>{data.verified ? 'Verified figures.' : 'Unverified figures.'}</strong> Last updated{' '}
        {data.effectiveDate}. Source:{' '}
        {isUrl ? (
          <a href={data.source} className="underline" rel="noreferrer">
            {data.source}
          </a>
        ) : (
          data.source
        )}
        .
      </p>
      {data.notes ? <p className="mt-1">{data.notes}</p> : null}
    </div>
  );
}
