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
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface UniversalLoginFormProps {
  initialRole?: UserRole;
  onLoginSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export function UniversalLoginForm({ initialRole = 'customer', onLoginSuccess, onSwitchToSignup }: UniversalLoginFormProps) {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoginRole, setCurrentLoginRole] = useState<UserRole>(initialRole);

  // Hardcoded English strings
  const translations = {
    customerLoginTitle: "Customer Login",
    adminLoginTitle: "Admin Login",
    customerDescription: "Access your account to continue shopping.",
    adminDescription: "Access the management dashboard.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    loginButton: "Login",
    loginAsAdmin: "Login as Admin",
    loginAsCustomer: "Login as Customer",
    dontHaveAccount: "Don't have an account?",
    signUpLink: "Sign up"
  };

  const loginSchema = z.object({
    email: currentLoginRole === 'admin'
      ? z.string().min(1, { message: 'Admin username cannot be empty' })
      : z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  });
  
  type LoginFormInputs = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      const user = await login(data.email, data.password);
      if (user) {
        toast({ title: 'Login Successful', description: `Welcome back, ${user.name || user.email}!` });
        if (onLoginSuccess) onLoginSuccess();
        reset();

        if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/products');
        }
      } else {
         toast({
          title: 'Login Failed',
          description: 'Invalid email or password.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleToggle = () => {
    setCurrentLoginRole(prevRole => prevRole === 'customer' ? 'admin' : 'customer');
    reset(); 
  };

  return (
    <>
      <CardHeader className="text-center pt-6 pb-4">
        <CardTitle className="font-headline text-2xl md:text-3xl text-primary">
          {currentLoginRole === 'customer' ? translations.customerLoginTitle : translations.adminLoginTitle}
        </CardTitle>
        <CardDescription className="text-sm">
          {currentLoginRole === 'customer' ? translations.customerDescription : translations.adminDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="email-universal">{translations.emailLabel}</Label>
            <Input
              id="email-universal" type="email" placeholder={translations.emailPlaceholder}
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive pt-1">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-universal">{translations.passwordLabel}</Label>
            <Input
              id="password-universal" type="password" placeholder="••••••••"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-xs text-destructive pt-1">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {translations.loginButton}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 px-6 pb-6 pt-4">
        <Button variant="link" onClick={handleRoleToggle} className="text-sm h-auto p-1">
          {currentLoginRole === 'customer' ? translations.loginAsAdmin : translations.loginAsCustomer}
        </Button>
        {currentLoginRole === 'customer' && onSwitchToSignup && (
          <p className="text-sm text-muted-foreground">
            {translations.dontHaveAccount}{' '}
            <Button variant="link" onClick={onSwitchToSignup} className="p-0 h-auto font-medium text-primary hover:underline">
              {translations.signUpLink}
            </Button>
          </p>
        )}
      </CardFooter>
    </>
  );
}
