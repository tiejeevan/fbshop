import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css'; // Adjusted path
import { AppProviders } from '@/components/AppProviders';
import { Toaster } from '@/components/ui/toaster';
import { ThemeApplicator } from '@/components/shared/ThemeApplicator';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Local Commerce',
  description: 'A complete shopping web application using only browser Local Storage.',
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: {locale: string};
}

export default async function RootLayout({
  children,
  params: {locale}
}: Readonly<RootLayoutProps>) {
  // Providing all messages to the client
  // side is a simp_step approach. You could
  // also provide only the messages for the current route.
  const messages = await getMessages();
 
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            <ThemeApplicator />
            {children}
            <Toaster />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}