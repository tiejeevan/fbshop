
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css'; // Corrected path
import { AppProviders } from '@/components/AppProviders';
import { Toaster } from '@/components/ui/toaster';
import { ThemeApplicator } from '@/components/shared/ThemeApplicator';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Local Commerce',
  description: 'A complete shopping web application using only browser Local Storage.',
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: {locale: string};
}

// Define supported locales (can be imported from i18n.ts or a shared config if needed)
const locales = ['en', 'es'];

export default async function RootLayout({
  children,
  params
}: Readonly<RootLayoutProps>) {
  const locale = params.locale;

  // Validate locale
  if (!locales.includes(locale)) {
    console.error(`[RootLayout] Invalid locale param: "${locale}". Supported: ${locales.join(', ')}. Triggering notFound.`);
    notFound();
  }
 
  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    console.error(`[RootLayout] Error fetching messages for locale "${locale}". This likely means i18n.ts had an issue. Error:`, error);
    notFound();
  }

  if (!messages) {
    console.error(`[RootLayout] Messages object is undefined for locale "${locale}" after getMessages(). i18n.ts might not be correctly returning messages. Triggering notFound.`);
    notFound();
  }
 
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
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
