
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CategoryForm, CategoryFormValues } from '../../CategoryForm';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';
// Removed: import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService'; - Now handled by dataService

const generateCategoryChangeDescription = (oldCategory: Category, newData: CategoryFormValues, imageChanged: boolean, oldParentName?: string, newParentName?: string): string => {
  const changes: string[] = [];
  if (oldCategory.name !== newData.name) {
    changes.push(`Name changed from "${oldCategory.name}" to "${newData.name}".`);
  }
  if (oldCategory.slug !== newData.slug) {
    changes.push(`Slug changed from "${oldCategory.slug}" to "${newData.slug}".`);
  }
  if ((oldCategory.description || '') !== (newData.description || '')) {
    changes.push('Description updated.');
  }
  if (oldCategory.parentId !== newData.parentId) {
    const oldP = oldParentName || (oldCategory.parentId ? 'N/A' : 'None');
    const newP = newParentName || (newData.parentId ? 'N/A' : 'None');
    changes.push(`Parent category changed from "${oldP}" to "${newP}".`);
  }
  if (oldCategory.displayOrder !== newData.displayOrder) {
    changes.push(`Display order changed from ${oldCategory.displayOrder} to ${newData.displayOrder}.`);
  }
  if (oldCategory.isActive !== newData.isActive) {
    changes.push(`Status changed from ${oldCategory.isActive ? 'Active' : 'Inactive'} to ${newData.isActive ? 'Active' : 'Inactive'}.`);
  }
  if (imageChanged) {
    changes.push('Image updated.');
  } else if (newData.imageId === null && oldCategory.imageId !== null) {
    changes.push('Image removed.');
  }


  if (changes.length === 0) {
    return `No significant changes detected for category "${newData.name}".`;
  }
  return `Updated category "${newData.name}": ${changes.join(' ')}`;
};


export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchCategoryData = useCallback(async (categoryId: string) => {
    if (isDataSourceLoading || !dataService) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedCategory, fetchedAllCategories] = await Promise.all([
        dataService.findCategoryById(categoryId),
        dataService.getCategories()
      ]);
      
      if (fetchedCategory) {
        setCategory(fetchedCategory);
      } else {
        toast({ title: "Category Not Found", variant: "destructive" });
        router.push('/admin/categories');
      }
      setAllCategories(fetchedAllCategories);
    } catch (error) {
      console.error("Error fetching category data:", error);
      toast({ title: "Error", description: "Could not load category data.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, router, toast]);

  useEffect(() => {
    if(params?.id) {
      fetchCategoryData(params.id);
    }
  }, [params, fetchCategoryData]);

  const handleEditCategory = async (data: CategoryFormValues, imageFile: File | null, id?: string) => {
    if (!id || !category || !currentUser || !dataService) {
      toast({ title: "Error", description: "Missing data or admin session.", variant: "destructive" });
      return;
    }

    const oldCategorySnapshot = { ...category };
    let newImageId = category.imageId;
    let imageUpdatedInThisAction = false;
    
    const oldParentName = oldCategorySnapshot.parentId ? (await dataService.findCategoryById(oldCategorySnapshot.parentId))?.name : undefined;
    const newParentName = data.parentId ? (await dataService.findCategoryById(data.parentId))?.name : undefined;

    try {
      if (imageFile) {
        if (category.imageId) {
          await dataService.deleteImage(category.imageId);
        }
        newImageId = await dataService.saveImage(`category_${data.slug || category.slug}`, 'main', imageFile);
        imageUpdatedInThisAction = true;
      } else if (data.imageId === null && category.imageId) {
        await dataService.deleteImage(category.imageId);
        newImageId = null;
        imageUpdatedInThisAction = true; // Image was present and now removed
      }

      const updatedCategoryData: Category = {
        ...category, // Spread old category to keep createdAt, id, etc.
        ...data, // Spread new form values
        imageId: newImageId, // Set new imageId
        id, // Ensure ID is correct
        updatedAt: new Date().toISOString(), // Handled by service usually, but good for client state
      };
      await dataService.updateCategory(updatedCategoryData);

      const logDescription = generateCategoryChangeDescription(oldCategorySnapshot, data, imageUpdatedInThisAction, oldParentName, newParentName);
      await dataService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'CATEGORY_UPDATE',
        entityType: 'Category',
        entityId: id,
        description: logDescription
      });

      toast({ title: "Category Updated", description: `"${data.name}" has been successfully updated.` });
      router.push('/admin/categories');
    } catch (error) {
      console.error("Error updating category:", error);
      toast({ title: "Error Updating Category", variant: "destructive" });
    }
  };

  if (isLoading || isDataSourceLoading || !params?.id) {
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
