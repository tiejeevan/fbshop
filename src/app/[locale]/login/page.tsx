'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation'; // For App router, use from next/navigation
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CustomerLoginPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('CustomerLoginPage');

  useEffect(() => {
    if (!isLoading) { 
      if (currentUser) { 
        if (currentUser.role === 'customer') {
          router.replace('/products'); 
        } else {
          router.replace('/');
        }
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || (!isLoading && currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  return (
    <LoginForm
      role="customer"
      redirectPath="/products" // next-intl Link/router handles locale prefix
      title={t('title')}
      description={t('description')}
      signupPath="/signup" // next-intl Link/router handles locale prefix
    />
  );
}
