
'use client';

import React from 'react';
import { JobCategoryForm, JobCategoryFormValues } from '../JobCategoryForm';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

export default function NewJobCategoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService } = useDataSource();

  const handleCreateCategory = async (data: JobCategoryFormValues) => {
    if (!currentUser || !dataService) {
      toast({ title: "Authentication or Data Service Error", variant: "destructive" });
      return;
    }
    try {
      const newCategory = await dataService.addJobCategory(data);
      await dataService.addActivityLog({
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: 'admin',
        actionType: 'JOB_CATEGORY_CREATE',
        entityType: 'JobCategory',
        entityId: newCategory.id,
        description: `Created job category "${newCategory.name}".`
      });
      toast({ title: "Job Category Created", description: `"${data.name}" has been successfully added.` });
      router.push('/admin/job-categories');
    } catch (error) {
      console.error("Error creating job category:", error);
      toast({ title: "Error Creating Category", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/job-categories">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Categories
        </Link>
      </Button>
      <JobCategoryForm onFormSubmit={handleCreateCategory} />
    </div>
  );
}
