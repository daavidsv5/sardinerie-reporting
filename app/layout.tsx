import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { FiltersProvider } from '@/hooks/useFilters';
import ConditionalLayout from '@/components/layout/ConditionalLayout';

export const metadata: Metadata = {
  title: 'Shoptet Reporting',
  description: 'Shoptet e-commerce reporting dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>
        <SessionProvider>
          <FiltersProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </FiltersProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
