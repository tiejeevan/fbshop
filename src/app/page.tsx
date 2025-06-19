
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
// Removed Button, Link, UserCog, ShoppingBag, UserPlus, cn, buttonVariants as the page will primarily be a redirector.

export default function HomePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser && currentUser.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        // For customers (logged in or not) and unauthenticated users,
        // redirect to the products page.
        router.replace('/products');
      }
    }
  }, [currentUser, isLoading, router]);

  // Display a loader while authentication status is being checked and redirection occurs.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">Loading Local Commerce...</p>
    </div>
  );
}
