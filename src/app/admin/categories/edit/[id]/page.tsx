
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
import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService'; // Assuming reuse

export default function EditCategoryPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [category, setCategory] = useState<Category | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchedCategory = localStorageService.findCategoryById(params.id);
    if (fetchedCategory) {
      setCategory(fetchedCategory);
    } else {
      toast({ title: "Category Not Found", variant: "destructive" });
      router.push('/admin/categories');
    }
    setAllCategories(localStorageService.getCategories());
    setIsLoading(false);
  }, [params.id, router, toast]);

  const handleEditCategory = async (data: CategoryFormValues, imageFile: File | null, id?: string) => {
    if (!id || !category) return; 
    
    let newImageId = category.imageId; // Start with existing imageId

    try {
      if (imageFile) { // New image uploaded
        if (category.imageId) { // If there was an old image, delete it
          await deleteImageFromDB(category.imageId);
        }
        // Save new image
        newImageId = await saveImageToDB(`category_${data.slug || category.slug}`, 'main', imageFile);
      } else if (data.imageId === null && category.imageId) { 
        // This case means the form explicitly set imageId to null (e.g. remove button was clicked)
        await deleteImageFromDB(category.imageId);
        newImageId = null;
      }

      const updatedCategoryData: Category = {
        ...category, 
        ...data, // Form values
        imageId: newImageId, // Updated imageId
        id, 
        updatedAt: new Date().toISOString(),
      };
      localStorageService.updateCategory(updatedCategoryData);
      toast({ title: "Category Updated", description: `"${data.name}" has been successfully updated.` });
      router.push('/admin/categories');
    } catch (error) {
      console.error("Error updating category:", error);
      toast({ title: "Error Updating Category", variant: "destructive" });
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
      <CategoryForm initialData={category} onFormSubmit={handleEditCategory} allCategories={allCategories} />
    </div>
  );
}
