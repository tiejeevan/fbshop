
'use client';

import React, { useEffect } from 'react';
import { CustomerNavbar } from '@/components/customer/CustomerNavbar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/products', '/products/category/[slug]', '/products/[id]'];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = publicPaths.some(p => {
    if (p.includes('[slug]') || p.includes('[id]')) {
      const regex = new RegExp(`^${p.replace(/\[.*?\]/g, '[^/]+')}$`);
      return regex.test(pathname);
    }
    return p === pathname;
  });
  const isRootPath = pathname === '/';

  useEffect(() => {
    if (!isLoading && !isRootPath && !isPublicPath) {
      if (!currentUser) {
        router.replace('/products');
      }
    }
  }, [currentUser, isLoading, router, pathname, isPublicPath, isRootPath]);

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
          <div key={pathname} className="animate-page-enter">
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
