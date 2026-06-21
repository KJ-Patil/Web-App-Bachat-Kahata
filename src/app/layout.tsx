import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers/providers';
import NextTopLoader from 'nextjs-toploader';
import '@/app/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Bachat Khata - Personal Wealth Manager',
  description: 'Your Secure Personal Finance Companion',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextTopLoader
          color="#2299DD"
          showSpinner={true}
          height={4}
          shadow="0 0 10px #2299DD,0 0 5px #2299DD"
          zIndex={9999}
          speed={200}
        />
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" closeButton duration={4000} expand={false} />
      </body>
    </html>
  );
}
