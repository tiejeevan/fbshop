
'use client';

import React, { useEffect, useState } from 'react';
import { CategoryForm, CategoryFormValues } from '../CategoryForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB } from '@/lib/indexedDbService'; // Assuming reuse of product image save

export default function NewCategoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  useEffect(() => {
    setAllCategories(localStorageService.getCategories());
  }, []);

  const handleCreateCategory = async (data: CategoryFormValues, imageFile: File | null) => {
    try {
      let imageId: string | null = null;
      if (imageFile) {
        // Use a distinct prefix or method for category images if needed
        imageId = await saveImageToDB(`category_${data.slug}`, 'main', imageFile);
      }

      localStorageService.addCategory({
        ...data, // slug, parentId, displayOrder, isActive are in data
        imageId, // Set the saved imageId
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
