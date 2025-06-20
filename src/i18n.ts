
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Define supported locales
const locales = ['en', 'es'];

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is a supported locale
  const baseLocale = locale.split('-')[0]; // Handle cases like 'en-US'

  if (!locales.includes(baseLocale)) {
    console.error(`[i18n.ts] ERROR: Invalid locale provided: "${locale}". Supported locales are: ${locales.join(', ')}. Triggering notFound().`);
    notFound();
  }

  let messages;
  try {
    // Dynamically import the messages for the requested locale.
    // The path is relative to the `src` directory because i18n.ts is in src/.
    messages = (await import(`./messages/${baseLocale}.json`)).default;
    
    // Verify that messages is a non-null object
    if (typeof messages !== 'object' || messages === null) {
      console.error(`[i18n.ts] ERROR: Messages for locale "${baseLocale}" resolved to null or not an object. Content type: ${typeof messages}. Triggering notFound().`);
      notFound();
    }
  } catch (error) {
    console.error(`[i18n.ts] ERROR: Failed to load messages for locale "${baseLocale}".json. Error:`, error);
    // If messages can't be loaded for a valid locale, trigger notFound.
    // This prevents rendering with missing translations which can lead to context errors.
    notFound();
  }

  return {
    messages
  };
});
