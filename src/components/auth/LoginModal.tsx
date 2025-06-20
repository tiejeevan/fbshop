'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UniversalLoginForm } from './UniversalLoginForm';
import { SignupForm } from './SignupForm';
import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function LoginModal() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const t = useTranslations('LoginModal');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setView('login'); 
    }
  };

  const handleLoginSuccess = () => {
    setOpen(false);
    setView('login');
  };

  const handleSignupSuccess = () => {
    // After signup, prompt to login within the modal
    toast({ title: tDialogSignup('successTitle'), description: tDialogSignup('successDescription') });
    setView('login'); 
    // Optionally, could close the modal: setOpen(false);
  };


  const switchToSignup = () => {
    setView('signup');
  };

  const switchToLogin = () => {
    setView('login');
  };

  const tDialogLogin = useTranslations('UniversalLoginForm');
  const tDialogSignup = useTranslations('SignupForm');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LogIn className="mr-2 h-4 w-4" /> {t('loginButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {view === 'login' ? t('dialogTitleLogin') : t('dialogTitleSignup')}
          </DialogTitle>
        </DialogHeader>
        
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
