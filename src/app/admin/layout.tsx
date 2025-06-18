
'use client';

import React, { useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { navItems } from '@/components/admin/AdminSidebar'; // Assuming navItems can be exported or defined here

// If navItems cannot be directly imported, redefine them here or pass AdminSidebar as a component to SheetContent
const mobileNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Loader2 }, // Placeholder, update with actual icons
  { href: '/admin/products', label: 'Products', icon: Loader2 },
  { href: '/admin/categories', label: 'Categories', icon: Loader2 },
  { href: '/admin/customers', label: 'Customers', icon: Loader2 },
  { href: '/admin/analytics', label: 'Analytics', icon: Loader2 },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Added to use in useEffect if needed

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser || currentUser.role !== 'admin') {
        // To prevent redirect loop if somehow /admin/login was part of this layout (it's not here)
        if (pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
      }
    }
  }, [currentUser, isLoading, router, pathname]);

  // If initial auth check is happening
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // After auth check, if user is admin, render layout
  if (currentUser && currentUser.role === 'admin') {
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
                      <PanelLeft className="h-6 w-6 text-sidebar-primary" /> {/* Use an appropriate icon */}
                      <span className="font-headline text-xl">Local Commerce</span>
                  </Link>
                  </div>
                  <nav className="grid items-start px-4 py-4 text-sm font-medium">
                    {/* Re-using navItems or a similar structure for mobile */}
                    {/* This assumes navItems is available. You might need to adjust AdminSidebar.tsx to export it or duplicate the structure */}
                    {/* For simplicity, using the previously hardcoded links as a fallback structure. Ideally, this would be dynamic. */}
                    <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Dashboard</Link>
                    <Link href="/admin/products" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Products</Link>
                    <Link href="/admin/categories" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Categories</Link>
                    <Link href="/admin/customers" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Customers</Link>
                    <Link href="/admin/analytics" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Analytics</Link>
                  </nav>
              </SheetContent>
            </Sheet>
            <div className="flex-1">
              {/* Dynamically set header title based on page or keep generic */}
              <h1 className="font-headline text-lg font-semibold text-foreground">
                {/* Example: {pathname.split('/').pop()?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Admin'} */}
                Admin Panel
              </h1>
            </div>
            {/* Add User menu or other header items here if needed */}
          </header>
          <main className="flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // If not loading, and not an admin (useEffect should be redirecting)
  // Show a loader while the redirect initiated by useEffect is in progress.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Verifying access...</p>
    </div>
  );
}
