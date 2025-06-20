
'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  
  // Hardcoded English strings
  const translations = {
    title: "Admin Portal Login",
    description: "Access the Local Commerce management dashboard."
  };

  useEffect(() => {
    if (!isLoading) { 
      if (currentUser) { 
        if (currentUser.role === 'admin') {
          router.replace('/admin/dashboard'); 
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
      role="admin"
      redirectPath="/admin/dashboard"
      title={translations.title}
      description={translations.description}
    />
  );
}
