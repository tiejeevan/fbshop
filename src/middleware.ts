
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localeDetection: true,
  // Explicitly point to the i18n config file, relative to this middleware file.
  // Since both are in src/, './i18n.ts' is correct.
  i18nConfigPath: './i18n.ts' 
});
 
export const config = {
  // Match all pathnames except for
  // - …certain internal Next.js paths starting with `_next`
  // - …API routes
  // - …static files (e.g. images, fonts, etc.)
  // - …anything with a file extension (e.g. .ico, .png)
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)']
};
