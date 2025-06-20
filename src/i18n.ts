import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!['en', 'es'].includes(locale)) {
    // Potentially redirect or use a default locale if invalid
    // For now, we assume valid locale based on middleware
  }
 
  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});