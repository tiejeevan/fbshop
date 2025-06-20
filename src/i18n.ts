
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Define supported locales
const locales = ['en', 'es'];

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  const baseLocale = locale.split('-')[0];

  if (!locales.includes(baseLocale)) {
    console.error(`[i18n.ts - Minimal] Invalid locale provided: "${locale}". Supported: ${locales.join(', ')}. Triggering notFound.`);
    notFound();
  }

  // For testing, return minimal static messages
  // This helps determine if the issue is finding the config file vs. loading messages.
  if (baseLocale === 'en') {
    return {
      messages: {
        HomePage: {
          loading: "Loading Local Commerce..."
        },
        CustomerNavbar: {
          login: "Login",
          storeName: "Local Commerce"
        }
      }
    };
  } else if (baseLocale === 'es') {
    return {
      messages: {
        HomePage: {
          loading: "Cargando Comercio Local..."
        },
        CustomerNavbar: {
          login: "Iniciar Sesión",
          storeName: "Comercio Local"
        }
      }
    };
  }

  // Fallback if locale is valid but not 'en' or 'es' (shouldn't happen with current locales array)
  console.error(`[i18n.ts - Minimal] No static messages defined for locale: "${baseLocale}". Triggering notFound.`);
  notFound();
});

