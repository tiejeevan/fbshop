'use client';

import React, { useEffect } from 'react';
import { CustomerNavbar } from '@/components/customer/CustomerNavbar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation'; // Corrected import for App Router
import { Loader2 } from 'lucide-react';

// Publicly accessible paths within the customer layout
// These paths are relative to the /[locale]/ prefix
const publicPaths = ['/products', '/products/category/[slug]', '/products/[id]'];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // This will include the locale

  // We need to strip the locale from the pathname for comparison with publicPaths
  const pathnameWithoutLocale = pathname.startsWith('/en/') ? pathname.substring(3) : 
                                pathname.startsWith('/es/') ? pathname.substring(3) : pathname;


  const isPublicPath = publicPaths.some(p => {
    if (p.includes('[slug]') || p.includes('[id]')) {
      const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
      return regex.test(pathnameWithoutLocale);
    }
    return p === pathnameWithoutLocale;
  });
  const isRootPath = pathnameWithoutLocale === '/'; // Root path relative to locale

  useEffect(() => {
    if (!isLoading && !isRootPath && !isPublicPath) {
      if (!currentUser) {
        router.replace('/products'); // Locale prefix will be handled by navigation
      }
    }
  }, [currentUser, isLoading, router, pathnameWithoutLocale, isPublicPath, isRootPath]);

  if (isLoading && !isRootPath && !isPublicPath && !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoading && !isRootPath && !isPublicPath && !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <CustomerNavbar />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div key={pathname} className="animate-page-enter"> {/* pathname includes locale for key */}
            {children}
          </div>
        </div>
      </main>
      <footer className="py-8 text-center border-t bg-card">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Local Commerce. All rights reserved (in your browser!).
        </p>
      </footer>
    </div>
  );
}
