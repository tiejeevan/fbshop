
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { JobForm, type JobFormValues } from '@/components/admin/jobs/JobForm';
import type { JobCategory, Job } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

export default function AdminNewJobPage() {
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchInitialData = useCallback(async () => {
    if (isDataSourceLoading || !dataService) return;
    setIsLoading(true);
    try {
      const fetchedCategories = await dataService.getJobCategories();
      setJobCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching job categories:", error);
      toast({ title: "Error", description: "Could not load job categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCreateJob = async (data: JobFormValues) => {
    if (!currentUser || !dataService) {
      toast({ title: "Admin session or Data Service not found", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      // For admin-created jobs, the expiry might be handled differently.
      // For now, let's set a default of 7 days for admin-created jobs.
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const jobData: Omit<Job, 'id' | 'createdAt' | 'createdByName' | 'creatorHasReviewed' | 'acceptorHasReviewed'| 'imageUrls' | 'categoryName'> = {
        ...data,
        createdById: currentUser.id,
        expiresAt: expiresAt.toISOString(),
      };

      const newJob = await dataService.addJob(jobData);
      
      await dataService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'JOB_CREATE',
        entityType: 'Job',
        entityId: newJob.id,
        description: `Admin created job: "${newJob.title}"`
      });

      toast({ title: "Job Created Successfully" });
      router.push('/admin/jobs');

    } catch (error) {
      console.error("Error creating job as admin:", error);
      toast({ title: "Error Creating Job", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isDataSourceLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Jobs
        </Link>
      </Button>
      <JobForm 
        allCategories={jobCategories}
        onFormSubmit={handleCreateJob}
        isSubmitting={isSubmitting}
        isEditing={false}
      />
    </div>
  );
}
