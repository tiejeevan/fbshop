
'use client';

import React, { useEffect, useState } from 'react';
import { CategoryForm, CategoryFormValues } from '../CategoryForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB } from '@/lib/indexedDbService'; 

export default function NewCategoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    setAllCategories(localStorageService.getCategories());
  }, []);

  const handleCreateCategory = async (data: CategoryFormValues, imageFile: File | null) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", variant: "destructive" });
      return;
    }
    try {
      let imageId: string | null = null;
      if (imageFile) {
        imageId = await saveImageToDB(`category_${data.slug}`, 'main', imageFile);
      }

      const newCategory = localStorageService.addCategory({
        ...data, 
        imageId, 
      });

      await localStorageService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'CATEGORY_CREATE',
        entityType: 'Category',
        entityId: newCategory.id,
        description: `Created category "${newCategory.name}" (ID: ${newCategory.id.substring(0,8)}...).`
      });

      toast({ title: "Category Created", description: `"${data.name}" has been successfully added.` });
      router.push('/admin/categories');
    } catch (error) {
      console.error("Error creating category:", error);
      toast({ title: "Error Creating Category", description: "Could not create the category. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/categories">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Categories
        </Link>
      </Button>
      <CategoryForm onFormSubmit={handleCreateCategory} allCategories={allCategories} />
    </div>
  );
}
