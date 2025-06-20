
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Define supported locales
const locales = ['en', 'es'];

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  // and normalize it (e.g., 'en-US' -> 'en').
  const baseLocale = locale.split('-')[0];

  if (!locales.includes(baseLocale as any)) {
    console.error(`[next-intl] Invalid locale provided: "${locale}". Supported locales are "en", "es". Triggering notFound.`);
    notFound();
  }

  let messages;
  try {
    // Use a relative path from src/i18n.ts to src/messages/
    messages = (await import(`./messages/${baseLocale}.json`)).default;
  } catch (error) {
    console.error(`[next-intl] Could not load messages for locale "${baseLocale}". Error:`, error);
    // If messages for a valid locale are missing, treat as not found.
    // This prevents rendering with a broken i18n context.
    notFound();
  }
 
  return {
    messages
  };
});
