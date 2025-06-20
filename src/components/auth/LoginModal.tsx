
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
import { useToast } from '@/hooks/use-toast'; // Added for toast

export function LoginModal() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const { toast } = useToast(); // Added for toast

  // Hardcoded English strings
  const translations = {
    loginButton: "Login",
    dialogTitleLogin: "User Login",
    dialogTitleSignup: "User Sign Up",
    signupSuccessTitle: "Account Created",
    signupSuccessDescription: "Please log in to continue."
  };

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
    toast({ title: translations.signupSuccessTitle, description: translations.signupSuccessDescription });
    setView('login'); 
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
          <LogIn className="mr-2 h-4 w-4" /> {translations.loginButton}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {view === 'login' ? translations.dialogTitleLogin : translations.dialogTitleSignup}
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
