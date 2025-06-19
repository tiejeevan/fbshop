
'use client';

import React, { useEffect, useState, use } from 'react';
import { CategoryForm, CategoryFormValues } from '../../CategoryForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService';

export default function EditCategoryPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [category, setCategory] = useState<Category | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

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
    if (!id || !category || !currentUser) {
      toast({ title: "Error", description: "Missing data or admin session.", variant: "destructive" });
      return;
    }
    
    let newImageId = category.imageId; 

    try {
      if (imageFile) { 
        if (category.imageId) { 
          await deleteImageFromDB(category.imageId);
        }
        newImageId = await saveImageToDB(`category_${data.slug || category.slug}`, 'main', imageFile);
      } else if (data.imageId === null && category.imageId) { 
        await deleteImageFromDB(category.imageId);
        newImageId = null;
      }

      const updatedCategoryData: Category = {
        ...category, 
        ...data, 
        imageId: newImageId, 
        id, 
        updatedAt: new Date().toISOString(),
      };
      localStorageService.updateCategory(updatedCategoryData);

      await localStorageService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'CATEGORY_UPDATE',
        entityType: 'Category',
        entityId: id,
        description: `Updated category "${data.name}" (ID: ${id.substring(0,8)}...).`
      });

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
