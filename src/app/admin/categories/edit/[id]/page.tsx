
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

// Helper to generate detailed change descriptions
const generateCategoryChangeDescription = (oldCategory: Category, newData: CategoryFormValues, imageChanged: boolean): string => {
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
    const oldParentName = oldCategory.parentId ? (localStorageService.findCategoryById(oldCategory.parentId)?.name || 'N/A') : 'None';
    const newParentName = newData.parentId ? (localStorageService.findCategoryById(newData.parentId)?.name || 'N/A') : 'None';
    changes.push(`Parent category changed from "${oldParentName}" to "${newParentName}".`);
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

    const oldCategorySnapshot = { ...category };
    let newImageId = category.imageId;
    let imageUpdatedInThisAction = false;

    try {
      if (imageFile) {
        if (category.imageId) {
          await deleteImageFromDB(category.imageId);
        }
        newImageId = await saveImageToDB(`category_${data.slug || category.slug}`, 'main', imageFile);
        imageUpdatedInThisAction = true;
      } else if (data.imageId === null && category.imageId) { // Image was explicitly removed in form
        await deleteImageFromDB(category.imageId);
        newImageId = null;
        imageUpdatedInThisAction = true; // Log as an image change (removal)
      }

      const updatedCategoryData: Category = {
        ...category,
        ...data,
        imageId: newImageId,
        id,
        updatedAt: new Date().toISOString(),
      };
      localStorageService.updateCategory(updatedCategoryData);

      const logDescription = generateCategoryChangeDescription(oldCategorySnapshot, data, imageUpdatedInThisAction);
      await localStorageService.addAdminActionLog({
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
    