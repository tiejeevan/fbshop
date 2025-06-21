
'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { JobCategoryForm, JobCategoryFormValues } from '../../JobCategoryForm';
import type { JobCategory } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

const generateChangeDescription = (oldCategory: JobCategory, newData: JobCategoryFormValues): string => {
  const changes: string[] = [];
  if (oldCategory.name !== newData.name) changes.push(`Name: "${oldCategory.name}" -> "${newData.name}".`);
  if (oldCategory.slug !== newData.slug) changes.push(`Slug: "${oldCategory.slug}" -> "${newData.slug}".`);
  if ((oldCategory.description || '') !== (newData.description || '')) changes.push('Description updated.');
  if (changes.length === 0) return `No significant changes detected for job category "${newData.name}".`;
  return `Updated job category "${newData.name}": ${changes.join(' ')}`;
};

export default function EditJobCategoryPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const categoryId = params.id;

  const [category, setCategory] = useState<JobCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchCategoryData = useCallback(async (id: string) => {
    if (isDataSourceLoading || !dataService) return;
    setIsLoading(true);
    try {
      const fetchedCategory = await dataService.findJobCategoryById(id);
      if (fetchedCategory) {
        setCategory(fetchedCategory);
      } else {
        toast({ title: "Job Category Not Found", variant: "destructive" });
        router.push('/admin/job-categories');
      }
    } catch (error) {
      console.error("Error fetching job category data:", error);
      toast({ title: "Error", description: "Could not load job category data.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, router, toast]);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryData(categoryId);
    }
  }, [categoryId, fetchCategoryData]);

  const handleEditCategory = async (data: JobCategoryFormValues, id?: string) => {
    if (!id || !category || !currentUser || !dataService) {
      toast({ title: "Error", description: "Missing data.", variant: "destructive" });
      return;
    }
    try {
      await dataService.updateJobCategory({ ...data, id, createdAt: category.createdAt, updatedAt: '' });
      const logDescription = generateChangeDescription(category, data);
      await dataService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'JOB_CATEGORY_UPDATE',
        entityType: 'JobCategory',
        entityId: id,
        description: logDescription
      });
      toast({ title: "Job Category Updated" });
      router.push('/admin/job-categories');
    } catch (error) {
      console.error("Error updating job category:", error);
      toast({ title: "Error Updating Category", variant: "destructive" });
    }
  };

  if (isLoading || isDataSourceLoading || !categoryId) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading category data...</div>;
  }

  if (!category) {
    return <div className="text-center py-10 text-destructive">Category not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/job-categories">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Categories
        </Link>
      </Button>
      <JobCategoryForm initialData={category} onFormSubmit={handleEditCategory} />
    </div>
  );
}
