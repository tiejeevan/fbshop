
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobSettings, Job } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Loader2, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { add } from 'date-fns';

const jobFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000, 'Description cannot exceed 1000 characters'),
  durationInHours: z.coerce.number().int().min(1, 'Duration must be at least 1 hour'),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export default function NewJobPage() {
  const [settings, setSettings] = useState<JobSettings | null>(null);
  const [userJobsCount, setUserJobsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();
  const router = useRouter();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
  });
  
  const fetchPrerequisites = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading) {
      if (!currentUser && !isDataSourceLoading) router.push('/login?redirect=/jobs/new');
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedSettings, userJobs] = await Promise.all([
        dataService.getJobSettings(),
        dataService.getJobs({ createdById: currentUser.id, status: 'open' }),
      ]);
      setSettings(fetchedSettings);
      setUserJobsCount(userJobs.length);
    } catch (error) {
      console.error("Error fetching job prerequisites:", error);
      toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
      router.push('/jobs');
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, currentUser, toast, router]);

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);

  const onSubmit: SubmitHandler<JobFormValues> = async (data) => {
    if (!currentUser || !dataService || !settings) return;

    if (userJobsCount >= settings.maxJobsPerUser) {
        toast({ title: "Limit Reached", description: `You can only have ${settings.maxJobsPerUser} active jobs at a time.`, variant: "destructive" });
        return;
    }

    const expiresAt = add(new Date(), { hours: data.durationInHours });

    try {
      const newJobData = {
        title: data.title,
        description: data.description,
        createdById: currentUser.id,
        expiresAt: expiresAt.toISOString(),
      };
      await dataService.addJob(newJobData);
      toast({ title: "Job Created Successfully!", description: "Your job is now live." });
      router.push('/profile/jobs');
    } catch (error) {
      console.error("Error creating job:", error);
      toast({ title: "Error", description: "Could not create the job.", variant: "destructive" });
    }
  };
  
  if (isLoading || isDataSourceLoading) {
    return <div className="text-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>;
  }
  
  if (!settings) {
    return <div className="text-center py-20 text-destructive">Could not load job settings. Please try again later.</div>
  }

  const canPostJob = userJobsCount < settings.maxJobsPerUser;
  const maxDurationInHours = settings.maxTimerDurationDays * 24;

  const durationOptions = [
    { value: 1, label: '1 Hour' }, { value: 6, label: '6 Hours' }, { value: 12, label: '12 Hours' },
    { value: 24, label: '1 Day' }, { value: 48, label: '2 Days' }, { value: 72, label: '3 Days' },
    { value: 120, label: '5 Days' }, { value: 168, label: '7 Days' }, { value: 240, label: '10 Days' },
  ].filter(opt => opt.value <= maxDurationInHours);
  
  return (
    <div className="max-w-2xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl flex items-center gap-3"><Briefcase /> Create a New Job</CardTitle>
                <CardDescription>
                    Post a new job for other users to accept. You have {userJobsCount} active jobs out of your limit of {settings.maxJobsPerUser}.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {canPostJob ? (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="title">Job Title</Label>
                                <Input id="title" {...register('title')} placeholder="e.g., 'Help moving a couch'" />
                                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" {...register('description')} placeholder="Provide details about the job, location, and what's required." rows={6}/>
                                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="durationInHours">Job Duration (Timer)</Label>
                                <Select onValueChange={(value) => setValue('durationInHours', Number(value))} defaultValue="24">
                                    <SelectTrigger id="durationInHours">
                                        <SelectValue placeholder="Select how long the job is available" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {durationOptions.map(opt => (
                                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.durationInHours && <p className="text-sm text-destructive">{errors.durationInHours.message}</p>}
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-6 bg-muted rounded-md">
                            <h3 className="font-semibold text-lg text-destructive">Job Limit Reached</h3>
                            <p className="text-muted-foreground">You cannot post new jobs until one of your active jobs is completed or expires.</p>
                        </div>
                    )}
                </CardContent>
                {canPostJob && (
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Post Job
                        </Button>
                    </CardFooter>
                )}
            </form>
        </Card>
    </div>
  );
}
