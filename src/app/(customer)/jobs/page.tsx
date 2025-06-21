
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Job } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Loader2, Briefcase, PlusCircle, UserCheck } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();
  const router = useRouter();

  const fetchJobs = useCallback(async () => {
    if (isDataSourceLoading || !dataService) return;
    setIsLoading(true);
    try {
      const openJobs = await dataService.getJobs({ status: 'open' });
      // Filter out jobs created by the current user
      const availableJobs = currentUser ? openJobs.filter(job => job.createdById !== currentUser.id) : openJobs;
      setJobs(availableJobs);
    } catch (error) {
      console.error("Error fetching open jobs:", error);
      toast({ title: "Error", description: "Could not load available jobs.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast, currentUser]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  
  const handleAcceptJob = async (jobId: string) => {
    if (!currentUser || !dataService) {
        toast({ title: "Login Required", description: "You must be logged in to accept a job.", variant: "destructive" });
        return;
    }
    try {
        const updatedJob = await dataService.acceptJob(jobId, currentUser.id, currentUser.name || currentUser.email);
        if(updatedJob) {
            toast({ title: "Job Accepted!", description: "You can view this job in your profile." });
            fetchJobs(); // Re-fetch to remove the accepted job from the list
            router.push('/profile/jobs');
        } else {
            toast({ title: "Failed to Accept", description: "This job may no longer be available.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error accepting job:", error);
        toast({ title: "Error", description: "An error occurred while accepting the job.", variant: "destructive" });
    }
  };

  if (isLoading || isDataSourceLoading) {
    return <div className="text-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-5xl text-primary flex items-center gap-3"><Briefcase /> Available Jobs</h1>
          <p className="text-lg text-muted-foreground mt-1">Find opportunities posted by other users.</p>
        </div>
        <Button asChild><Link href="/jobs/new"><PlusCircle className="mr-2 h-4 w-4" /> Create a New Job</Link></Button>
      </header>

      {jobs.length === 0 ? (
        <Card className="text-center py-16">
            <CardHeader>
                <CardTitle>No Jobs Available</CardTitle>
                <CardDescription>There are currently no open jobs posted by other users. Why not create one?</CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <Card key={job.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{job.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${job.createdByName.charAt(0)}`} alt={job.createdByName} data-ai-hint="user avatar" />
                        <AvatarFallback>{job.createdByName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{job.createdByName}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3">{job.description}</p>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-3 border-t pt-4">
                <div className="flex justify-between w-full text-xs text-muted-foreground">
                    <span>Expires: {formatDistanceToNow(parseISO(job.expiresAt), { addSuffix: true })}</span>
                    <span>Posted: {formatDistanceToNow(parseISO(job.createdAt), { addSuffix: true })}</span>
                </div>
                {currentUser && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full"><UserCheck className="mr-2 h-4 w-4" />Accept Job</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Accept this job?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to accept the job: "{job.title}". This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleAcceptJob(job.id)}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                 {!currentUser && <Button className="w-full" disabled>Login to Accept</Button>}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
