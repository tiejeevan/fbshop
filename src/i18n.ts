
import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // Ensure locale is a string and one of the supported ones
  const validLocale = locale as string;
  if (!['en', 'es'].includes(validLocale)) {
    console.error(`[next-intl] Invalid locale provided: "${validLocale}". Supported locales are "en", "es".`);
    // Fallback to default or return empty messages to prevent further errors.
    // This helps in diagnosing if the issue is locale identification vs. config file finding.
    try {
        const defaultMessages = (await import(`./messages/en.json`)).default;
        console.warn(`[next-intl] Falling back to 'en' messages due to invalid locale: ${validLocale}`);
        return {messages: defaultMessages};
    } catch (e) {
        console.error(`[next-intl] Critical error: Failed to load default 'en' messages.`, e);
        return {messages: {}}; // Absolute fallback
    }
  }

  try {
    // Path relative from src/i18n.ts to src/messages/locale.json
    const messages = (await import(`./messages/${validLocale}.json`)).default;
    return {messages};
  } catch (error) {
    console.error(`[next-intl] Failed to load messages for locale "${validLocale}":`, error);
    // If specific locale messages fail, you might want to fall back to default or throw
    // For now, returning empty messages to isolate the "config file not found" issue.
    // If this part is reached, the error is about message loading, not the config file itself.
    return {messages: {}};
  }
});
