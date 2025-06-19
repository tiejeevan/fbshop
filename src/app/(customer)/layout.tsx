
'use client';

import React, { useEffect } from 'react';
import { CustomerNavbar } from '@/components/customer/CustomerNavbar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Publicly accessible paths within the customer layout
// /login is removed as it's no longer a page.
// All product-related paths and the root (which redirects to products) are public.
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
  const isRootPath = pathname === '/'; // Root path handling is now in page.tsx

  useEffect(() => {
    if (!isLoading && !isRootPath && !isPublicPath) { 
      if (!currentUser || currentUser.role !== 'customer') {
        // If trying to access a protected customer route (e.g. /cart, /profile) without being a logged-in customer,
        // redirect to /products. The LoginModal can be accessed from there.
        router.replace('/products'); 
      }
    }
  }, [currentUser, isLoading, router, pathname, isPublicPath, isRootPath]);

  if (isLoading && !isRootPath && !isPublicPath) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If redirecting (because user is not a customer for a protected route)
  if (!isLoading && !isRootPath && !isPublicPath && (!currentUser || currentUser.role !== 'customer')) {
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
          {children}
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
