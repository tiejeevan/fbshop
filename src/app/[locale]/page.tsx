'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Use from next/navigation for App Router
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('HomePage');

  useEffect(() => {
    if (!isLoading) {
      if (currentUser && currentUser.role === 'admin') {
        router.replace('/admin/dashboard'); // Locale will be prefixed by middleware
      } else {
        router.replace('/products'); // Locale will be prefixed by middleware
      }
    }
  }, [currentUser, isLoading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">{t('loading')}</p>
    </div>
  );
}
