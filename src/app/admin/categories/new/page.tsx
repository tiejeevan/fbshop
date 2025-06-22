'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CategoryForm, CategoryFormValues } from '../CategoryForm';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

export default function NewCategoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchInitialData = useCallback(async () => {
    if (isDataSourceLoading || !dataService) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedCategories = await dataService.getCategories();
      setAllCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({ title: "Error", description: "Could not load categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCreateCategory = async (data: CategoryFormValues, imageFile: File | null) => {
    if (!currentUser || !dataService) {
      toast({ title: "Authentication or Data Service Error", variant: "destructive" });
      return;
    }
    try {
      // Create the category document first to get an ID
      const initialCategoryData = {
        ...data,
        imageId: null, // Placeholder
      };
      const newCategory = await dataService.addCategory(initialCategoryData);

      let imageId: string | null = null;
      if (imageFile) {
        imageId = await dataService.saveImage(`category_${newCategory.id}`, 'main', imageFile);
        newCategory.imageId = imageId;
        await dataService.updateCategory(newCategory); // Update with the imageId
      }

      let logDescription = `Created category "${newCategory.name}" (ID: ${newCategory.id.substring(0,8)}) with slug "${newCategory.slug}".`;
      if (newCategory.parentId) {
        const parentCat = await dataService.findCategoryById(newCategory.parentId);
        const parentName = parentCat?.name || 'Unknown Parent';
        logDescription += ` Parent: "${parentName}".`;
      }
      if (imageId) logDescription += ' Image added.';
      logDescription += ` Status: ${newCategory.isActive ? 'Active' : 'Inactive'}. Display Order: ${newCategory.displayOrder}.`;


      await dataService.addActivityLog({
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: 'admin',
        actionType: 'CATEGORY_CREATE',
        entityType: 'Category',
        entityId: newCategory.id,
        description: logDescription
      });

      toast({ title: "Category Created", description: `"${data.name}" has been successfully added.` });
      router.push('/admin/categories');
    } catch (error) {
      console.error("Error creating category:", error);
      toast({ title: "Error Creating Category", description: "Could not create the category. Please try again.", variant: "destructive" });
    }
  };

  const nextDisplayOrder = allCategories.length > 0 ? Math.max(...allCategories.map(c => c.displayOrder)) + 1 : 1;
  const newCategoryInitialData: Partial<Category> = {
    displayOrder: nextDisplayOrder,
    isActive: true,
  };


  if (isLoading || isDataSourceLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/categories">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Categories
        </Link>
      </Button>
      <CategoryForm 
        initialData={newCategoryInitialData} 
        onFormSubmit={handleCreateCategory} 
        allCategories={allCategories} 
      />
    </div>
  );
}
