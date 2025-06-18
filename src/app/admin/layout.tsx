
'use client';

import React, { useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
// navItems import removed as it was causing issues, mobile nav is simplified.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) { // Only act once initial auth check is done
      if (!currentUser || currentUser.role !== 'admin') {
        // If user is not an admin or not logged in
        if (pathname !== '/admin/login') { // And not already on the login page
          router.replace('/admin/login'); // Redirect to login
        }
      } else if (currentUser && currentUser.role === 'admin' && pathname === '/admin/login') {
        // If user IS an admin and somehow landed on /admin/login, redirect to dashboard
        router.replace('/admin/dashboard');
      }
    }
  }, [currentUser, isLoading, router, pathname]);

  // 1. Initial loading state for auth context
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // 2. User is authenticated as admin
  if (currentUser && currentUser.role === 'admin') {
    // If an admin is on /admin/login, useEffect should redirect them.
    // While that happens, show a loader. Avoid rendering admin shell for login page.
    if (pathname === '/admin/login') {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Redirecting to dashboard...</p>
            </div>
        );
    }
    // Otherwise, render the admin shell with the actual page content
    return (
      <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <AdminSidebar />
        <div className="flex flex-col">
          <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6 sticky top-0 z-30">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground border-sidebar-border w-[280px]">
                 <div className="flex h-16 items-center border-b border-sidebar-border px-6 shrink-0">
                  <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground">
                      <PanelLeft className="h-6 w-6 text-sidebar-primary" />
                      <span className="font-headline text-xl">Local Commerce</span>
                  </Link>
                  </div>
                  <nav className="grid items-start px-4 py-4 text-sm font-medium">
                    <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Dashboard</Link>
                    <Link href="/admin/products" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Products</Link>
                    <Link href="/admin/categories" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Categories</Link>
                    <Link href="/admin/customers" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Customers</Link>
                    <Link href="/admin/analytics" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Analytics</Link>
                  </nav>
              </SheetContent>
            </Sheet>
            <div className="flex-1">
              <h1 className="font-headline text-lg font-semibold text-foreground">
                Admin Panel
              </h1>
            </div>
          </header>
          <main className="flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // 3. User is not admin (or not logged in), and not loading.
  //    If the current path IS /admin/login, we should render the children (which is AdminLoginPage).
  if (pathname === '/admin/login') {
    return <>{children}</>; // Allow AdminLoginPage to render
  }

  // 4. Fallback: User is on a protected admin page (not /admin/login),
  //    is not an admin, and initial loading is done.
  //    The useEffect should be redirecting them. Show a loader during this process.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Verifying access...</p>
    </div>
  );
}
