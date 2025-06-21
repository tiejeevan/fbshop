
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Job, JobCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Loader2, Briefcase, PlusCircle, UserCheck, ShieldCheck, Flame, Search, MapPin, Calendar, Clock } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { SavedJobButton } from '@/components/jobs/SavedJobButton';


export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchJobsAndCategories = useCallback(async () => {
    if (isDataSourceLoading || !dataService) return;
    setIsLoading(true);
    try {
      const [openJobs, fetchedCategories] = await Promise.all([
        dataService.getJobs({ status: 'open' }),
        dataService.getJobCategories()
      ]);
      const jobsWithCategoryNames = openJobs.map(job => ({
          ...job,
          categoryName: fetchedCategories.find(c => c.id === job.categoryId)?.name || 'Uncategorized',
      }));
      setJobs(jobsWithCategoryNames);
      setJobCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching jobs/categories:", error);
      toast({ title: "Error", description: "Could not load available jobs or categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchJobsAndCategories();
  }, [fetchJobsAndCategories]);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter(job => currentUser ? job.createdById !== currentUser.id : true) // Filter out user's own jobs
      .filter(job => (selectedCategory && selectedCategory !== 'all') ? job.categoryId === selectedCategory : true)
      .filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.description.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [jobs, selectedCategory, searchTerm, currentUser]);
  
  const handleAcceptJob = async (jobId: string) => {
    if (!currentUser || !dataService) {
        toast({ title: "Login Required", description: "You must be logged in to accept a job.", variant: "destructive" });
        return;
    }
    try {
        const updatedJob = await dataService.acceptJob(jobId, currentUser.id, currentUser.name || currentUser.email);
        if(updatedJob) {
            toast({ title: "Job Accepted!", description: "You can view this job in your profile." });
            fetchJobsAndCategories(); // Re-fetch to update list
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

      <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-card rounded-lg shadow items-center sticky top-20 z-10">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input type="search" placeholder="Search jobs by title or description..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {jobCategories.map(category => (<SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {filteredJobs.length === 0 ? (
        <Card className="text-center py-16">
            <CardHeader>
                <CardTitle>No Jobs Found</CardTitle>
                <CardDescription>
                  {searchTerm || selectedCategory !== 'all' 
                    ? "No jobs match your current filters."
                    : "There are currently no open jobs. Why not create one?"
                  }
                </CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => (
            <Card key={job.id} className="flex flex-col relative group">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    {job.categoryName && <Badge className="w-fit self-start">{job.categoryName}</Badge>}
                    <p className="text-lg font-bold text-primary">
                        {job.compensationAmount && job.compensationAmount > 0 ? `$${job.compensationAmount.toFixed(2)}` : 'Volunteer'}
                    </p>
                </div>
                <CardTitle className="font-headline text-xl pt-1">{job.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${job.createdByName.charAt(0)}`} alt={job.createdByName} data-ai-hint="user avatar" />
                        <AvatarFallback>{job.createdByName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                     <Link href={`/users/${job.createdById}`} className="hover:underline hover:text-primary">
                        <span>{job.createdByName}</span>
                    </Link>
                </div>
                 <div className="flex items-center gap-2 pt-2">
                    {job.isUrgent && <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1"/>Urgent</Badge>}
                    {job.isVerified && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300 border-none"><ShieldCheck className="h-3 w-3 mr-1"/>Verified</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3">{job.description}</p>
                <div className="flex flex-wrap text-xs text-muted-foreground gap-x-4 gap-y-1 mt-3 pt-3 border-t">
                  {job.location && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {job.location}</div>}
                  {job.preferredDate && <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {format(parseISO(job.preferredDate), 'PP')}</div>}
                  {job.estimatedDurationHours && <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {job.estimatedDurationHours} hours</div>}
                </div>
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
              {currentUser && <SavedJobButton jobId={job.id} className="absolute top-2 right-2" />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
