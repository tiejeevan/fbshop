
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Static imports for message files
import enMessages from './messages/en.json';
import esMessages from './messages/es.json';

const locales = ['en', 'es'];

// Define a type for your messages for better type safety if structures are consistent
// For simplicity, we'll use 'any' for now but ideally, this would be typed.
// type Messages = typeof enMessages; 
type Messages = Record<string, any>;


const allMessages: Record<string, Messages> = {
  en: enMessages,
  es: esMessages
};

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is a supported locale
  const baseLocale = locale.split('-')[0]; 

  if (!locales.includes(baseLocale)) {
    console.error(`[i18n.ts] ERROR: Invalid locale provided: "${locale}". Supported locales are: ${locales.join(', ')}. Triggering notFound().`);
    notFound();
  }

  const messages = allMessages[baseLocale];

  if (!messages || typeof messages !== 'object') {
    // This should not happen with static imports if JSON files are valid and present
    console.error(`[i18n.ts] ERROR: Messages for locale "${baseLocale}" not found or invalid. Triggering notFound().`);
    notFound();
  }

  return {
    messages
  };
});
