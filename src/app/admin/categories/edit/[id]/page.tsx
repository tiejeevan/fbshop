
'use client';

import React, { useEffect, useState, use } from 'react';
import { CategoryForm, CategoryFormValues } from '../../CategoryForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditCategoryPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchedCategory = localStorageService.findCategoryById(params.id);
    if (fetchedCategory) {
      setCategory(fetchedCategory);
    } else {
      toast({ title: "Category Not Found", description: "The category you are trying to edit does not exist.", variant: "destructive" });
      router.push('/admin/categories');
    }
    setIsLoading(false);
  }, [params.id, router, toast]);

  const handleEditCategory = async (data: CategoryFormValues, id?: string) => {
    if (!id || !category) return; 
    try {
      const updatedCategoryData: Category = {
        ...category, // Spread existing category data first
        name: data.name, // Then overwrite with form values
        description: data.description,
        // Include new fields from data, allowing them to be undefined if not set by form yet
        slug: data.slug || category.slug || data.name.toLowerCase().replace(/\s+/g, '-'), // auto-generate if still missing
        parentId: data.parentId !== undefined ? data.parentId : category.parentId,
        imageId: data.imageId !== undefined ? data.imageId : category.imageId,
        displayOrder: data.displayOrder !== undefined ? data.displayOrder : category.displayOrder,
        isActive: data.isActive !== undefined ? data.isActive : category.isActive,
        id, // id from params
        updatedAt: new Date().toISOString(), // Update timestamp
        createdAt: category.createdAt, // Preserve original createdAt
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
