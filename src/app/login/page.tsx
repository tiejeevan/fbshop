
'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function CustomerLoginPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) { // Only act once initial auth check is done
      if (currentUser) { // If any user is logged in
        if (currentUser.role === 'customer') {
          router.replace('/products'); // Customer is logged in, go to products
        } else {
          // Another role (e.g., admin) is logged in.
          // Redirect them away from the customer login page.
          // The root page will then direct them to their appropriate area.
          router.replace('/');
        }
      }
      // If no currentUser, this is an unauthenticated session, so customer login form should be shown.
    }
  }, [currentUser, isLoading, router]);

  // Show loader while isLoading is true, OR
  // if isLoading is false BUT currentUser exists (meaning a redirect is about to happen).
  if (isLoading || (!isLoading && currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  // This content is only rendered if isLoading is false AND there is no currentUser.
  return (
    <LoginForm
      role="customer"
      redirectPath="/products"
      title="Welcome Back!"
      description="Login to continue shopping."
      signupPath="/signup"
    />
  );
}
