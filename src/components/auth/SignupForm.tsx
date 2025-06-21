'use client';

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password must be at least 1 character' }),
  confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormInputs = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onNavigateToLogin?: () => void;
  onSignupSuccess?: () => void;
  loginPath?: string; 
}

export function SignupForm({ onNavigateToLogin, onSignupSuccess, loginPath }: SignupFormProps) {
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Hardcoded English strings
  const translations = {
    title: "Create an Account",
    description: "Join Local Commerce today!",
    nameLabel: "Full Name",
    namePlaceholder: "John Doe",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm Password",
    signupButton: "Sign Up",
    alreadyHaveAccount: "Already have an account?",
    loginLink: "Log in"
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      const user = await signup({ email: data.email, password: data.password, name: data.name });
      if (user) {
        toast({ title: 'Signup Successful', description: 'Welcome! Please login to continue.' });
        reset();
        if (onSignupSuccess) {
          onSignupSuccess();
        }
      } else {
        toast({
          title: 'Signup Failed',
          description: 'An account with this email already exists.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Signup Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center pt-6 pb-4">
        <CardTitle className="font-headline text-2xl md:text-3xl text-primary">{translations.title}</CardTitle>
        <CardDescription className="text-sm">{translations.description}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="name-signup">{translations.nameLabel}</Label>
            <Input
              id="name-signup" type="text" placeholder={translations.namePlaceholder}
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive pt-1">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-signup">{translations.emailLabel}</Label>
            <Input
              id="email-signup" type="email" placeholder={translations.emailPlaceholder}
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive pt-1">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-signup">{translations.passwordLabel}</Label>
            <Input
              id="password-signup" type="password" placeholder="••••••••"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-xs text-destructive pt-1">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword-signup">{translations.confirmPasswordLabel}</Label>
            <Input
              id="confirmPassword-signup" type="password" placeholder="••••••••"
              {...register('confirmPassword')}
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive pt-1">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {translations.signupButton}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 px-6 pb-6 pt-4">
        {onNavigateToLogin ? (
          <p className="text-sm text-muted-foreground">
            {translations.alreadyHaveAccount}{' '}
            <Button variant="link" onClick={onNavigateToLogin} className="p-0 h-auto font-medium text-primary hover:underline">
              {translations.loginLink}
            </Button>
          </p>
        ) : loginPath ? (
          <p className="text-sm text-muted-foreground">
             {translations.alreadyHaveAccount}{' '}
            <a href={loginPath} className="font-medium text-primary hover:underline">
              {translations.loginLink}
            </a>
          </p>
        ) : null}
      </CardFooter>
    </>
  );
}
