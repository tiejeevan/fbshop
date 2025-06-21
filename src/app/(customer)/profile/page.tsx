
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
import { Loader2, MapPin, History, Heart, Briefcase, Bookmark, X, Plus } from 'lucide-react';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Badge } from '@/components/ui/badge';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email(),
  skills: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { currentUser, refreshUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  
  const [currentSkill, setCurrentSkill] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

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
      setSkills(currentUser.skills || []);
    }
  }, [currentUser, setValue]);

  const handleAddSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };


  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!currentUser || !dataService) {
      toast({ title: "Error", description: "User or data service not available.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedUserData = { ...currentUser, name: data.name, skills };
      await dataService.updateUser(updatedUserData);
      refreshUser(); 
      toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error Updating Profile", description: "Could not update your profile. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isDataSourceLoading) {
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
          <form onSubmit={handleSubmit(onSubmit)}>
             <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Update your personal information and skills.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
              <div className="space-y-2">
                <Label htmlFor="skills">Your Skills</Label>
                <div className="flex gap-2">
                    <Input id="skills" value={currentSkill} onChange={e => setCurrentSkill(e.target.value)} placeholder="e.g. Painting, Plumbing" 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddSkill} variant="outline" size="icon">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                 <div className="flex flex-wrap gap-2 pt-2">
                    {skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                            {skill}
                            <button type="button" onClick={() => handleRemoveSkill(skill)} className="rounded-full hover:bg-destructive/20 p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
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
                        <Link href="/profile/saved-jobs"><Bookmark className="mr-3 h-5 w-5 text-primary"/> Saved Jobs</Link>
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
