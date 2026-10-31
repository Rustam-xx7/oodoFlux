import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Subscription Management System | oodoFlux',
  description:
    'Enterprise-grade subscription lifecycle, recurring billing, and financial analytics platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
