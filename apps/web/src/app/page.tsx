import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Own your car with your eyes open.</h1>
      <p className="max-w-2xl text-lg text-slate-600">
        Carwise SA is a free, open-source guide for South Africans, from deciding what you can
        afford to selling the car. Plain language, honest calculators, no accounts, and nothing
        leaves your browser.
      </p>
      <Link
        href="/phases"
        className="inline-block rounded-md bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
      >
        See the five ownership phases
      </Link>
    </section>
  );
}
