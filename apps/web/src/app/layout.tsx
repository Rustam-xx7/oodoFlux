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
    <html lang="en">
      <body className="min-h-screen bg-white text-[#334155] antialiased selection:bg-[#EEF2FF] selection:text-[#4F46E5]">
        {children}
      </body>
    </html>
  );
}
