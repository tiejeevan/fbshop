
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button'; // Keep for UserPlus button
import Link from 'next/link';
import { Loader2, UserCog, ShoppingBag, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button'; // Import buttonVariants

export default function HomePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        if (currentUser.role === 'customer') {
          router.replace('/products');
        } else if (currentUser.role === 'admin') {
          router.replace('/admin/dashboard');
        }
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || (!isLoading && currentUser)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading Local Commerce...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-6 text-center">
      <ShoppingBag className="h-20 w-20 text-primary mb-6" />
      <header className="mb-10">
        <h1 className="font-headline text-5xl md:text-6xl font-bold text-primary mb-4">
          Welcome to Local Commerce
        </h1>
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
          Your entirely local shopping experience. All data is stored right in your browser.
        </p>
      </header>

      <div className="bg-card p-8 rounded-xl shadow-2xl w-full max-w-lg mb-10 transform hover:scale-105 transition-transform duration-300">
        <h2 className="font-headline text-3xl text-primary mb-6">Start Shopping</h2>
        <p className="text-muted-foreground mb-6">
          Explore our products, manage your cart, and enjoy a seamless (simulated) checkout.
        </p>
        <div className="space-y-4">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: 'lg', variant: 'default' }), // Use default variant or specify as needed
              "w-full" // Ensure it takes full width
            )}
          >
            <ShoppingBag className="mr-2 h-5 w-5" /> Customer Login
          </Link>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/signup">
              <UserPlus className="mr-2 h-5 w-5" /> Create Customer Account
            </Link>
          </Button>
        </div>
      </div>

      <footer className="mt-auto pt-8 text-sm text-muted-foreground">
        <Link href="/admin/login" className="inline-flex items-center text-xs hover:text-primary hover:underline">
          <UserCog className="mr-1 h-3 w-3" /> Admin Portal
        </Link>
        <p className="mt-2">&copy; {new Date().getFullYear()} Local Commerce. Powered by Local Storage.</p>
      </footer>
    </div>
  );
}
