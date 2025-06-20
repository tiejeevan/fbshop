
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css'; // Adjusted path
import { AppProviders } from '@/components/AppProviders';
import { Toaster } from '@/components/ui/toaster';
import { ThemeApplicator } from '@/components/shared/ThemeApplicator';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation'; // Import notFound

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Local Commerce',
  description: 'A complete shopping web application using only browser Local Storage.',
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: {locale: string}; // params will be passed directly
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
    notFound();
  }
 
  // Providing all messages to the client
  // side is a simple approach. You could
  // also provide only the messages for the current route.
  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    console.error("Error fetching messages in RootLayout:", error);
    // If getMessages throws (e.g., due to config issues), render notFound
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
