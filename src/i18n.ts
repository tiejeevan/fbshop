
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Define supported locales
const locales = ['en', 'es'];

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  // and normalize it (e.g., 'en-US' -> 'en').
  const baseLocale = locale.split('-')[0];

  if (!locales.includes(baseLocale as any)) {
    console.error(`[i18n.ts] Invalid locale provided: "${locale}". Supported: ${locales.join(', ')}. Triggering notFound.`);
    notFound();
  }

  let messages;
  try {
    // Using a relative path from src/i18n.ts to src/messages/
    messages = (await import(`./messages/${baseLocale}.json`)).default;
  } catch (error) {
    console.error(`[i18n.ts] Could not load messages for locale "${baseLocale}". Path: ./messages/${baseLocale}.json. Error:`, error);
    // If messages for a valid locale are missing, treat as not found.
    notFound();
  }

  if (!messages) {
    // This case should ideally be caught by the try-catch above,
    // but as an extra safeguard:
    console.error(`[i18n.ts] Messages object is undefined for locale "${baseLocale}" after import. Triggering notFound.`);
    notFound();
  }

  return {
    messages
  };
});
