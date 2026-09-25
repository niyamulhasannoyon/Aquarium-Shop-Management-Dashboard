import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS & Retail Management | Niloy Friend Shop',
  description: 'Fast, touch-responsive POS & sales checkout screen.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
