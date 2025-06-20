
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Static imports for message files
import enMessages from './messages/en.json';
import esMessages from './messages/es.json';

const locales = ['en', 'es'];

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is a supported locale
  const baseLocale = locale.split('-')[0]; 

  if (!locales.includes(baseLocale)) {
    console.error(`[i18n.ts] ERROR: Invalid locale provided: "${locale}". Supported locales are: ${locales.join(', ')}. Triggering notFound().`);
    notFound();
  }

  let messages;
  if (baseLocale === 'en') {
    messages = enMessages;
  } else if (baseLocale === 'es') {
    messages = esMessages;
  } else {
    // This case should ideally be caught by the locales.includes check,
    // but as a safeguard:
    console.error(`[i18n.ts] ERROR: Locale "${baseLocale}" is not explicitly handled for message loading. Triggering notFound().`);
    notFound();
  }

  // Verify that messages is a non-null object after attempting to load
  if (typeof messages !== 'object' || messages === null) {
    console.error(`[i18n.ts] ERROR: Messages for locale "${baseLocale}" resolved to null or not an object. This indicates a problem with the imported JSON file (e.g., empty or malformed). Content type: ${typeof messages}. Triggering notFound().`);
    notFound();
  }

  return {
    messages
  };
});

