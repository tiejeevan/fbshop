'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        if (currentUser.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/products');
        }
      }
      // If not logged in, stay on this page to show login options
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading Local Commerce...</p>
      </div>
    );
  }
  
  // If not loading and not logged in, show a welcome/landing page
  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-6 text-center">
        <header className="mb-12">
          <h1 className="font-headline text-6xl font-bold text-primary mb-4">
            Welcome to Local Commerce
          </h1>
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
            Your entirely local shopping experience. All data is stored right in your browser.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          <div className="bg-card p-8 rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <h2 className="font-headline text-3xl text-primary mb-6">Shop as a Customer</h2>
            <p className="text-muted-foreground mb-6">
              Browse products, manage your cart, and experience a simulated checkout process.
            </p>
            <div className="space-y-4">
              <Button asChild className="w-full" size="lg">
                <Link href="/login">Customer Login</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <h2 className="font-headline text-3xl text-primary mb-6">Manage as an Admin</h2>
            <p className="text-muted-foreground mb-6">
              Oversee products, categories, customer accounts, and view analytics.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link href="/admin/login">Admin Login</Link>
            </Button>
          </div>
        </div>

        <footer className="mt-16 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Local Commerce. Powered by Local Storage.</p>
        </footer>
      </div>
    );
  }

  // Fallback for logged-in users if redirection hasn't happened yet (should be rare)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">Redirecting...</p>
    </div>
  );
}
