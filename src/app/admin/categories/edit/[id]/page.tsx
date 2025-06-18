
'use client';

import React, { useEffect, useState, use } from 'react'; // Import use
import { CategoryForm, CategoryFormValues } from '../../CategoryForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditCategoryPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) { // Update props
  const params = use(paramsPromise); // Resolve params
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchedCategory = localStorageService.findCategoryById(params.id); // Use resolved params.id
    if (fetchedCategory) {
      setCategory(fetchedCategory);
    } else {
      toast({ title: "Category Not Found", description: "The category you are trying to edit does not exist.", variant: "destructive" });
      router.push('/admin/categories');
    }
    setIsLoading(false);
  }, [params.id, router, toast]); // Update dependency array

  const handleEditCategory = async (data: CategoryFormValues, id?: string) => {
    if (!id) return; 
    try {
      const updatedCategoryData: Category = {
        ...(category as Category), 
        ...data,
        id,
      };
      localStorageService.updateCategory(updatedCategoryData);
      toast({ title: "Category Updated", description: `"${data.name}" has been successfully updated.` });
      router.push('/admin/categories');
    } catch (error) {
      console.error("Error updating category:", error);
      toast({ title: "Error Updating Category", description: "Could not update the category. Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading category data...</div>;
  }

  if (!category) {
    return <div className="text-center py-10 text-destructive">Category not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/categories">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Categories
        </Link>
      </Button>
      <CategoryForm initialData={category} onFormSubmit={handleEditCategory} />
    </div>
  );
}
