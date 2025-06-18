'use client';

import React, { useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser || currentUser.role !== 'admin') {
        router.replace('/admin/login');
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    // This case should ideally be handled by the redirect,
    // but it's a fallback while redirecting.
    return (
       <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

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
              {/* Mobile Sidebar Content - Can reuse AdminSidebar or a simplified version */}
               <div className="flex h-16 items-center border-b border-sidebar-border px-6 shrink-0">
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground">
                    <PanelLeft className="h-6 w-6 text-sidebar-primary" />
                    <span className="font-headline text-xl">Local Commerce</span>
                </Link>
                </div>
                {/* For simplicity, using a placeholder. Ideally, AdminSidebar logic would be adaptable or duplicated here */}
                <nav className="grid items-start px-4 py-4 text-sm font-medium">
                    <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Dashboard</Link>
                    <Link href="/admin/products" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Products</Link>
                    {/* ... more links ... */}
                </nav>
            </SheetContent>
          </Sheet>
          <div className="flex-1">
            <h1 className="font-headline text-lg font-semibold text-foreground">Admin Dashboard</h1>
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
