'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ProductForm, ProductFormValues } from '../ProductForm';
import type { Category, Product } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';
import { simpleUUID } from '@/lib/utils';

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
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
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({ title: "Error", description: "Could not load categories.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCreateProduct = async (
    data: ProductFormValues,
    _id?: string, // Not used for create
    imagesToSave?: {type: 'primary' | 'additional', index?: number, file: File}[],
    _imageIdsMarkedForDeletionByUI?: string[] // Not used for create
  ) => {
    if (!currentUser || !dataService) {
      toast({ title: "Authentication or Data Service Error", description: "Admin user or data service not found.", variant: "destructive" });
      return;
    }
    try {
      // First, create the product document to get a stable ID
      const initialProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'purchases' | 'averageRating' | 'reviewCount'> = {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        categoryId: data.categoryId,
        primaryImageId: null, // Placeholder
        additionalImageIds: [], // Placeholder
      };
      const newProduct = await dataService.addProduct(initialProductData);
      
      let primaryImageId: string | null = null;
      const additionalImageIds: string[] = [];
      let imageChangeLog = '';

      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          // Use the real product ID now for structured storage path
          const savedImageId = await dataService.saveImage(
            newProduct.id, 
            imgInfo.type === 'primary' ? 'primary' : (imgInfo.index?.toString() ?? Date.now().toString()),
            imgInfo.file
          );
          if (imgInfo.type === 'primary') {
            primaryImageId = savedImageId;
          } else {
            additionalImageIds.push(savedImageId);
          }
        }
      }

      // If images were uploaded, update the product document with the image IDs/URLs
      if (primaryImageId || additionalImageIds.length > 0) {
        newProduct.primaryImageId = primaryImageId;
        newProduct.additionalImageIds = additionalImageIds;
        await dataService.updateProduct(newProduct);
        imageChangeLog = ` ${primaryImageId ? 'Primary image added. ' : ''}${additionalImageIds.length > 0 ? `${additionalImageIds.length} additional image(s) added.` : ''}`;
      }

      const logDescription = `Created product "${newProduct.name}" (ID: ${newProduct.id.substring(0,8)}) with price $${newProduct.price.toFixed(2)} and stock ${newProduct.stock}.${imageChangeLog}`;

      await dataService.addActivityLog({
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: 'admin',
        actionType: 'PRODUCT_CREATE',
        entityType: 'Product',
        entityId: newProduct.id,
        description: logDescription
      });

      toast({ title: "Product Created", description: `"${data.name}" has been successfully added.` });
      router.push('/admin/products');
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({ 
          title: "Error Creating Product", 
          description: error.message || "An unexpected error occurred.",
          variant: "destructive" 
      });
    }
  };
  
  if (isLoading || isDataSourceLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>Loading initial data...</div>;
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/admin/products">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Link>
        </Button>
      <ProductForm categories={categories} onFormSubmit={handleCreateProduct} />
    </div>
  );
}
