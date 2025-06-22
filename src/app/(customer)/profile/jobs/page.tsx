
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Job, User, JobReview } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Briefcase, PlusCircle, MessageSquare, Star, RefreshCw, MapPin, Calendar, Clock } from 'lucide-react';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { JobReviewForm } from '@/components/jobs/JobReviewForm';
import { JobCountdown } from '@/components/jobs/JobCountdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StarRatingDisplay } from '@/components/product/StarRatingDisplay';

export default function MyJobsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [createdJobs, setCreatedJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [jobReviews, setJobReviews] = useState<JobReview[]>([]);
  const [isComponentLoading, setIsComponentLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();
  const router = useRouter();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [jobToReview, setJobToReview] = useState<Job | null>(null);

  const fetchJobsAndReviews = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading) {
      if (!currentUser && !authLoading) router.push('/login?redirect=/profile/jobs');
      return;
    }
    setIsComponentLoading(true);
    try {
      const [userCreatedJobs, userAcceptedJobs] = await Promise.all([
        dataService.getJobs({ createdById: currentUser.id }),
        dataService.getJobs({ acceptedById: currentUser.id }),
      ]);
      setCreatedJobs(userCreatedJobs);
      setAcceptedJobs(userAcceptedJobs);

      const allJobIds = [...userCreatedJobs, ...userAcceptedJobs].map(job => job.id);
      if (allJobIds.length > 0) {
        const reviewPromises = allJobIds.map(id => dataService.getReviewsForJob(id));
        const reviewsByJob = await Promise.all(reviewPromises);
        const fetchedReviews = reviewsByJob.flat();
        setJobReviews(fetchedReviews);
      } else {
        setJobReviews([]);
      }

    } catch (error) {
      console.error("Error fetching user's jobs and reviews:", error);
      toast({ title: "Error", description: "Could not load your jobs.", variant: "destructive" });
    } finally {
      setIsComponentLoading(false);
    }
  }, [currentUser, dataService, isDataSourceLoading, authLoading, router, toast]);

  useEffect(() => {
    fetchJobsAndReviews();
  }, [fetchJobsAndReviews]);

  const handleMarkComplete = async (jobId: string) => {
    if (!dataService) return;
    setProcessingJobId(jobId);
    try {
        await dataService.updateJob({ id: jobId, status: 'completed' });
        toast({ title: "Job Marked as Complete!" });
        fetchJobsAndReviews();
    } catch (error) {
        console.error("Error completing job:", error);
        toast({ title: "Error", description: "Could not update job status.", variant: "destructive" });
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleOpenReviewModal = (job: Job) => {
    setJobToReview(job);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmitted = () => {
    setIsReviewModalOpen(false);
    setJobToReview(null);
    fetchJobsAndReviews(); 
    toast({ title: "Review Submitted Successfully!" });
  };

  const handleRelistJob = (job: Job) => {
    const params = new URLSearchParams({
        title: job.title,
        description: job.description,
        categoryId: job.categoryId || '',
        compensationAmount: job.compensationAmount?.toString() || '',
        isUrgent: job.isUrgent?.toString() || 'false',
        location: job.location || '',
        estimatedDurationHours: job.estimatedDurationHours?.toString() || '',
    });
    if (job.preferredDate) {
        params.append('preferredDate', job.preferredDate);
    }

    router.push(`/jobs/new?${params.toString()}`);
  };


  if (isComponentLoading || authLoading || isDataSourceLoading) {
    return <div className="text-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>;
  }
  
  const JobCard = ({ job, isCreator }: { job: Job; isCreator: boolean }) => {
    const hasUserReviewed = isCreator ? job.creatorHasReviewed : job.acceptorHasReviewed;
    const reviewsForThisJob = jobReviews.filter(r => r.jobId === job.id);
    const otherPersonId = isCreator ? job.acceptedById : job.createdById;
    const reviewForOtherPerson = reviewsForThisJob.find(r => r.revieweeId === otherPersonId);

    const OtherPersonNameDisplay = () => {
        const name = isCreator ? job.acceptedByName : job.createdByName;
        if (!name || !otherPersonId) return <>N/A</>;

        const nameComponent = (
            <Link href={`/users/${otherPersonId}`} className="font-semibold hover:underline text-primary">
                {name}
            </Link>
        );

        if (reviewForOtherPerson) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>{nameComponent}</TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <div className="font-bold text-sm">Review of {name}</div>
                        <div className="my-1"><StarRatingDisplay rating={reviewForOtherPerson.rating} size="sm" /></div>
                        <div className="text-xs text-muted-foreground italic">"{reviewForOtherPerson.comment}"</div>
                    </TooltipContent>
                </Tooltip>
            );
        }
        return nameComponent;
    };

    const isProcessing = processingJobId === job.id;

    return (
        <Card className="flex flex-col relative">
            {isProcessing && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}
            <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <div className="text-sm text-muted-foreground">
                    {job.status === 'open' && 'Not yet accepted.'}
                    {job.status !== 'open' && (isCreator ? (
                        <>Accepted by: <OtherPersonNameDisplay /></>
                    ) : (
                        <>Created by: <OtherPersonNameDisplay /></>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex-grow space-y-3">
                <p className="line-clamp-2">{job.description}</p>
                 <div className="flex flex-wrap text-xs text-muted-foreground gap-x-4 gap-y-1 mt-3 pt-3 border-t">
                  {job.location && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {job.location}</div>}
                  {job.preferredDate && <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {format(parseISO(job.preferredDate), 'PP')}</div>}
                  {job.estimatedDurationHours && <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {job.estimatedDurationHours} hours</div>}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 border-t pt-3">
                <div className="flex justify-between w-full">
                    <Badge variant={job.status === 'open' ? 'default' : job.status === 'expired' ? 'destructive' : 'secondary'}>{job.status}</Badge>
                    <JobCountdown expiresAt={job.expiresAt} />
                </div>
                <div className="w-full flex flex-col gap-2">
                    {(job.status === 'accepted' || job.status === 'completed') && (
                        <Button size="sm" className="w-full" variant="outline" asChild disabled={isProcessing}>
                            <Link href={`/jobs/${job.id}/chat`}><MessageSquare className="mr-2 h-4 w-4" />Chat</Link>
                        </Button>
                    )}
                    {isCreator && job.status === 'accepted' && (
                        <Button size="sm" className="w-full" onClick={() => handleMarkComplete(job.id)} disabled={isProcessing}>Mark as Complete</Button>
                    )}
                     {isCreator && job.status === 'expired' && (
                        <Button size="sm" className="w-full" onClick={() => handleRelistJob(job)} disabled={isProcessing}>
                            <RefreshCw className="mr-2 h-4 w-4"/>Relist Job
                        </Button>
                    )}
                    {job.status === 'completed' && !hasUserReviewed && (
                        <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleOpenReviewModal(job)} disabled={isProcessing}>
                            <Star className="mr-2 h-4 w-4" /> Leave Review
                        </Button>
                    )}
                    {job.status === 'completed' && hasUserReviewed && (
                        <Button size="sm" className="w-full" disabled>
                            <Star className="mr-2 h-4 w-4" /> Review Submitted
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
  };

  return (
    <TooltipProvider>
        <div className="space-y-6">
        <header className="flex justify-between items-center">
            <h1 className="font-headline text-3xl text-primary flex items-center gap-3"><Briefcase />My Jobs</h1>
            <Button asChild><Link href="/jobs/new"><PlusCircle className="mr-2 h-4 w-4"/>Create New Job</Link></Button>
        </header>

        <Tabs defaultValue="created">
            <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="created">Created by Me ({createdJobs.length})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted by Me ({acceptedJobs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="created" className="mt-4">
            {createdJobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">You haven't created any jobs yet.</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {createdJobs.map(job => <JobCard key={job.id} job={job} isCreator={true} />)}
                </div>
            )}
            </TabsContent>
            <TabsContent value="accepted" className="mt-4">
                {acceptedJobs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">You haven't accepted any jobs yet.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {acceptedJobs.map(job => <JobCard key={job.id} job={job} isCreator={false} />)}
                    </div>
                )}
            </TabsContent>
        </Tabs>
        {jobToReview && currentUser && (
            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent>
                    <JobReviewForm 
                        job={jobToReview}
                        currentUser={currentUser}
                        onReviewSubmitted={handleReviewSubmitted}
                        onCancel={() => setIsReviewModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        )}
        </div>
    </TooltipProvider>
  );
}
