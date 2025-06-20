
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es'],
 
  // Used when no locale matches
  defaultLocale: 'en',

  // Optionally, configure locale detection strategies
  localeDetection: true, 

  // By default, the middleware will look for `i18n.ts` (or `.js`)
  // in the same directory. If `middleware.ts` is in `src/`, then
  // `i18n.ts` should also be in `src/`.
});
 
export const config = {
  // Match all pathnames except for
  // - …certain internal Next.js paths starting with `_next`
  // - …API routes
  // - …static files (e.g. images, fonts, etc.)
  // - …anything with a file extension (e.g. .ico, .png)
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)']
};
