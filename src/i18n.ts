
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation'; // Ensure this is imported

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
    // Use the @ alias which points to src/
    messages = (await import(`@/messages/${baseLocale}.json`)).default;
  } catch (error) {
    console.error(`[next-intl] Could not load messages for locale "${baseLocale}". Error:`, error);
    // If messages for a valid locale are missing, treat as not found.
    notFound();
  }

  if (!messages) {
    // This case should ideally be caught by the try-catch above,
    // but as an extra safeguard:
    console.error(`[next-intl] Messages object is undefined for locale "${baseLocale}" after import. Triggering notFound.`);
    notFound();
  }
 
  return {
    messages
  };
});

