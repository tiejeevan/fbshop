
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { localStorageService } from '@/lib/localStorage';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email(), // Email is read-only for this form
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { currentUser, refreshUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (currentUser) {
      setValue('name', currentUser.name || '');
      setValue('email', currentUser.email);
    }
  }, [currentUser, setValue]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const updatedUserData = { ...currentUser, name: data.name };
      localStorageService.updateUser(updatedUserData);
      refreshUser(); // Refresh AuthContext
      toast({ title: 'Profile Updated', description: 'Your name has been successfully updated.' });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error Updating Profile", description: "Could not update your profile. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading profile...</div>;
  }

  if (!currentUser) {
    return <div className="text-center py-10">Please log in to view your profile. <Link href="/login" className="text-primary hover:underline">Login</Link></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl text-primary">Your Profile</h1>
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" {...register('email')} readOnly className="bg-muted/50 cursor-not-allowed" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
             {/* Add password change form here if desired in future */}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
