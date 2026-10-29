import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Carwise SA',
  description:
    'Free, open-source guide and calculators for owning a car in South Africa, from planning to selling.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="min-h-screen bg-white text-slate-900">
        <header className="border-b border-slate-200">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold">
              Carwise SA
            </Link>
            <Link href="/phases" className="text-sm text-slate-600 hover:text-slate-900">
              Ownership phases
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 py-8 text-sm text-slate-500">
          Results are estimates, not financial advice. Your data never leaves your browser.
        </footer>
      </body>
    </html>
  );
}
