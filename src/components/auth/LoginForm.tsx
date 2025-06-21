
'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  role: UserRole;
  redirectPath: string;
  title?: string;
  description?: string;
  signupPath?: string;
}

// Define the validation schema based on the role
const getLoginSchema = (role: UserRole) => {
  const baseSchema = {
    password: z.string().min(1, { message: "Password cannot be empty" }),
  };

  if (role === 'admin') {
    return z.object({
      ...baseSchema,
      email: z.string().min(1, { message: "Admin username cannot be empty" }), // No email format validation for admin
    });
  }

  // Default to customer validation
  return z.object({
    ...baseSchema,
    email: z.string().email({ message: "Invalid email address" }),
  });
};


export function LoginForm({ role, redirectPath, title, description, signupPath }: LoginFormProps) {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loginSchema = getLoginSchema(role);
  type LoginFormInputs = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      const user = await login(data.email, data.password);
      if (user) {
        if (user.role === role) {
          toast({ title: 'Login Successful', description: `Welcome back, ${user.name || user.email}!` });
          router.replace(redirectPath);
        } else {
          toast({
            title: 'Login Failed',
            description: `Access denied. This login is for ${role} users.`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid credentials.',
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl text-primary">{title || `${role.charAt(0).toUpperCase() + role.slice(1)} Login`}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{role === 'admin' ? 'Admin Username' : 'Email'}</Label>
              <Input
                id="email"
                type={role === 'admin' ? 'text' : 'email'}
                placeholder={role === 'admin' ? 'a' : 'you@example.com'}
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
          </form>
        </CardContent>
        {signupPath && (
          <CardFooter className="flex flex-col items-center space-y-2 pt-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <a href={signupPath} className="font-medium text-primary hover:underline">
                Sign up
              </a>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
