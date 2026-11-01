import type { Metadata } from 'next';
import { GarageApp } from './garage-app';

export const metadata: Metadata = { title: 'My garage | Carwise SA' };

export default function GaragePage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My garage</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Keep your car&apos;s details, a log of services, parts and repairs, and reminders for your
          licence disc and service plan. It all stays on your device.
        </p>
      </div>
      <GarageApp />
    </section>
  );
}
