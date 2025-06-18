'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && currentUser && currentUser.role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isLoading && currentUser && currentUser.role === 'admin') {
     // Already handled by useEffect, but good for initial render before effect runs
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <LoginForm
      role="admin"
      redirectPath="/admin/dashboard"
      title="Admin Portal Login"
      description="Access the Local Commerce management dashboard."
    />
  );
}
