
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
import { Loader2, MapPin, History, Heart, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext'; // Added

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { currentUser, refreshUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { dataService, isLoading: isDataSourceLoading } = useDataSource(); // Added

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
    if (!currentUser || !dataService) { // Check for dataService
      toast({ title: "Error", description: "User or data service not available.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    try {
      // Email cannot be changed directly here, only name.
      // Password changes would need a separate, more secure form.
      const updatedUserData = { ...currentUser, name: data.name };
      await dataService.updateUser(updatedUserData); // Use dataService
      refreshUser(); 
      toast({ title: 'Profile Updated', description: 'Your name has been successfully updated.' });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error Updating Profile", description: "Could not update your profile. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isDataSourceLoading) { // Check both loading states
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading profile...</div>;
  }

  if (!currentUser) {
    return <div className="text-center py-10">Please log in to view your profile. <Link href="/login" className="text-primary hover:underline">Login</Link></div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="font-headline text-3xl text-primary">Your Profile</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="max-w-xl">
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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || isDataSourceLoading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                     <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/profile/addresses"><MapPin className="mr-3 h-5 w-5 text-primary"/> Manage Addresses</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/profile/orders"><History className="mr-3 h-5 w-5 text-primary"/> View Order History</Link>
                    </Button>
                     <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/profile/jobs"><Briefcase className="mr-3 h-5 w-5 text-primary"/> My Jobs</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/profile/wishlist"><Heart className="mr-3 h-5 w-5 text-primary"/> My Wishlist</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
