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
import { useTranslations } from 'next-intl';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Please confirm your password' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormInputs = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onNavigateToLogin?: () => void;
  onSignupSuccess?: () => void;
  loginPath?: string; // Used if this form is on a dedicated page
}

export function SignupForm({ onNavigateToLogin, onSignupSuccess, loginPath }: SignupFormProps) {
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('SignupForm');

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
        <CardTitle className="font-headline text-2xl md:text-3xl text-primary">{t('title')}</CardTitle>
        <CardDescription className="text-sm">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="name-signup">{t('nameLabel')}</Label>
            <Input
              id="name-signup" type="text" placeholder={t('namePlaceholder')}
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive pt-1">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-signup">{t('emailLabel')}</Label>
            <Input
              id="email-signup" type="email" placeholder={t('emailPlaceholder')}
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive pt-1">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-signup">{t('passwordLabel')}</Label>
            <Input
              id="password-signup" type="password" placeholder="••••••••"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-xs text-destructive pt-1">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword-signup">{t('confirmPasswordLabel')}</Label>
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
            {t('signupButton')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 px-6 pb-6 pt-4">
        {onNavigateToLogin ? (
          <p className="text-sm text-muted-foreground">
            {t('alreadyHaveAccount')}{' '}
            <Button variant="link" onClick={onNavigateToLogin} className="p-0 h-auto font-medium text-primary hover:underline">
              {t('loginLink')}
            </Button>
          </p>
        ) : loginPath ? ( // For dedicated signup page
          <p className="text-sm text-muted-foreground">
             {t('alreadyHaveAccount')}{' '}
            <a href={loginPath} className="font-medium text-primary hover:underline">
              {t('loginLink')}
            </a>
          </p>
        ) : null}
      </CardFooter>
    </>
  );
}
