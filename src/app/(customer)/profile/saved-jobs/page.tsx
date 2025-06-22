
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Job, JobSavedItem } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BookmarkX, Briefcase, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDataSource } from '@/contexts/DataSourceContext';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

export default function SavedJobsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [isComponentLoading, setIsComponentLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const router = useRouter();

  const fetchSavedJobs = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading) {
      if (!authLoading && !currentUser) router.push('/login?redirect=/profile/saved-jobs');
      return;
    }
    setIsComponentLoading(true);
    try {
      const savedItems: JobSavedItem[] = await dataService.getSavedJobs(currentUser.id);
      const jobDetailsPromises: Promise<Job | undefined>[] = savedItems.map(item => dataService.findJobById(item.jobId));
      
      const resolvedJobDetails = await Promise.all(jobDetailsPromises);
      const validJobs = resolvedJobDetails.filter((job): job is Job => job !== undefined);
      
      validJobs.sort((a,b) => {
          const itemA = savedItems.find(i => i.jobId === a.id);
          const itemB = savedItems.find(i => i.jobId === b.id);
          return new Date(itemB?.addedAt || 0).getTime() - new Date(itemA?.addedAt || 0).getTime();
      });
      setSavedJobs(validJobs);
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
      toast({ title: "Error", description: "Could not load saved jobs.", variant: "destructive" });
      setSavedJobs([]);
    } finally {
      setIsComponentLoading(false);
    }
  }, [currentUser, dataService, isDataSourceLoading, toast, authLoading, router]);

  useEffect(() => {
    if (!authLoading) {
        fetchSavedJobs();
    }
    const handleSavedJobUpdate = () => fetchSavedJobs();
    window.addEventListener('savedJobUpdated', handleSavedJobUpdate);
    return () => window.removeEventListener('savedJobUpdated', handleSavedJobUpdate);
  }, [currentUser, authLoading, fetchSavedJobs]);

  const handleRemoveFromSaved = async (jobId: string) => {
    if (!currentUser || !dataService) return;
    setProcessingJobId(jobId);
    try {
        await dataService.removeFromSavedJobs(currentUser.id, jobId);
        setSavedJobs(prev => prev.filter(j => j.id !== jobId));
        toast({ title: "Removed from Saved Jobs" });
        window.dispatchEvent(new CustomEvent('savedJobUpdated'));
    } catch (error) {
        toast({ title: "Error", description: "Could not remove from saved jobs.", variant: "destructive" });
    } finally {
      setProcessingJobId(null);
    }
  };

  if (authLoading || isDataSourceLoading || isComponentLoading) {
    return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> Loading...</div>;
  }
  
  if (!currentUser) {
    return <div className="text-center py-10">Please <Link href="/login?redirect=/profile/saved-jobs" className="text-primary hover:underline">login</Link>.</div>;
  }

  if (savedJobs.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <BookmarkX className="h-24 w-24 mx-auto text-muted-foreground" />
        <h1 className="font-headline text-4xl text-primary">No Saved Jobs</h1>
        <p className="text-muted-foreground">You haven't saved any jobs yet.</p>
        <Button asChild size="lg"><Link href="/jobs"><ArrowLeft className="mr-2 h-5 w-5" /> Browse Jobs</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-headline text-4xl text-primary">My Saved Jobs</h1>
        <p className="text-muted-foreground">Jobs you've bookmarked for later.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedJobs.map(job => (
          <Card key={job.id} className="flex flex-col relative">
              {processingJobId === job.id && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <p className="text-lg font-bold text-primary">
                        {job.compensationAmount && job.compensationAmount > 0 ? `$${job.compensationAmount.toFixed(2)}` : 'Volunteer'}
                    </p>
                </div>
                <CardTitle className="font-headline text-xl pt-1 hover:text-primary"><Link href={`/jobs`}>{job.title}</Link></CardTitle>
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
                    <Badge variant={job.status === 'open' ? 'default' : 'outline'}>{job.status}</Badge>
                </div>
                <Button variant="outline" className="w-full" onClick={() => handleRemoveFromSaved(job.id)} disabled={!!processingJobId}>
                    <BookmarkX className="mr-2 h-4 w-4" /> Remove
                </Button>
              </CardFooter>
            </Card>
          ))}
      </div>
    </div>
  );
}
