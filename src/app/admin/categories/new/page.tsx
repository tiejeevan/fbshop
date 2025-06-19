
'use client';

import React from 'react';
import { CategoryForm, CategoryFormValues } from '../CategoryForm';
import { localStorageService } from '@/lib/localStorage';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewCategoryPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateCategory = async (data: CategoryFormValues) => {
    try {
      // localStorageService.addCategory will handle defaults for new fields
      localStorageService.addCategory({
        name: data.name,
        description: data.description,
        // Pass other fields if they are part of CategoryFormValues and set by the form in the future
        slug: data.slug,
        parentId: data.parentId,
        imageId: data.imageId,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
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
      <CategoryForm onFormSubmit={handleCreateCategory} />
    </div>
  );
}
