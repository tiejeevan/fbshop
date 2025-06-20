import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es'],
 
  // Used when no locale matches
  defaultLocale: 'en',

  // Optionally, configure locale detection strategies
  localeDetection: true, // Enable auto-detection (based on Accept-Language header)

  // Prefix handling (optional, default is 'as-needed')
  // localePrefix: 'always', // e.g., always show /en/products

  // Pathname internationalization (optional)
  // pathnames: {
  //   // If all pathnames are the same across locales, you can use '/'
  //   // e.g., if you have `/products` for both English and Spanish
  //   '/products': '/products',
 
  //   // If you have different pathnames per locale
  //   '/products': {
  //     en: '/products',
  //     es: '/productos'
  //   }
  // }
});
 
export const config = {
  // Match only internationalized pathnames
  // Skip internal paths like `/_next`
  matcher: ['/', '/(en|es)/:path*']
};