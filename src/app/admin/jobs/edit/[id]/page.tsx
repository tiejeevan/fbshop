
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { JobForm, type JobFormValues } from '@/components/admin/jobs/JobForm';
import type { Job, JobCategory } from '@/types';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

export default function AdminEditJobPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;
  
  const [job, setJob] = useState<Job | null>(null);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchInitialData = useCallback(async (id: string) => {
    if (isDataSourceLoading || !dataService) return;
    setIsLoading(true);
    try {
      const [fetchedJob, fetchedCategories] = await Promise.all([
        dataService.findJobById(id),
        dataService.getJobCategories()
      ]);

      if (fetchedJob) {
        setJob(fetchedJob);
      } else {
        toast({ title: "Job Not Found", variant: "destructive" });
        router.push('/admin/jobs');
      }
      setJobCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching job data for edit:", error);
      toast({ title: "Error", description: "Could not load job data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, router, toast]);

  useEffect(() => {
    if (jobId) {
      fetchInitialData(jobId);
    }
  }, [jobId, fetchInitialData]);

  const handleUpdateJob = async (data: JobFormValues) => {
    if (!jobId || !job || !currentUser || !dataService) {
      toast({ title: "Error", description: "Required data for update is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const updatePayload: Partial<Job> & { id: string } = {
        id: jobId,
        ...data,
      };

      await dataService.updateJob(updatePayload);

      await dataService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'JOB_UPDATE',
        entityType: 'Job',
        entityId: jobId,
        description: `Admin updated job: "${data.title}"`
      });

      toast({ title: "Job Updated Successfully" });
      router.push('/admin/jobs');

    } catch (error) {
      console.error("Error updating job as admin:", error);
      toast({ title: "Error Updating Job", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isDataSourceLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>Loading job data...</div>;
  }
  
  if (!job) {
    return <div className="text-center py-10 text-destructive">Job not found. It might have been deleted.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Jobs
        </Link>
      </Button>
      <JobForm 
        initialData={job}
        allCategories={jobCategories}
        onFormSubmit={handleUpdateJob}
        isSubmitting={isSubmitting}
        isEditing={true}
      />
    </div>
  );
}
