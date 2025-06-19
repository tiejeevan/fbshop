
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UniversalLoginForm } from './UniversalLoginForm';
import { SignupForm } from './SignupForm';
import { LogIn } from 'lucide-react';

export function LoginModal() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setView('login'); // Reset to login view when modal is closed
    }
  };

  const handleLoginSuccess = () => {
    setOpen(false);
    setView('login');
  };

  const handleSignupSuccess = () => {
    setOpen(false);
    setView('login'); // After signup, prompt to login
    // Or, could auto-login and redirect, but explicit login after signup is common
    // For now, redirecting to login view.
  };

  const switchToSignup = () => {
    setView('signup');
  };

  const switchToLogin = () => {
    setView('login');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LogIn className="mr-2 h-4 w-4" /> Login
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {view === 'login' && (
          <UniversalLoginForm
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignup={switchToSignup}
          />
        )}
        {view === 'signup' && (
          <SignupForm
            onSignupSuccess={handleSignupSuccess}
            onNavigateToLogin={switchToLogin}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
