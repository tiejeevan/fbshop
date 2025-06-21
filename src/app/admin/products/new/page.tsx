
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
      let primaryImageId: string | null = null;
      const additionalImageIds: string[] = [];
      const tempProductIdForImages = `temp_product_${simpleUUID()}`; // Used as entityId for image saving

      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          const savedImageId = await dataService.saveImage(
            tempProductIdForImages, // Temporary or actual product ID if generated before image save
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

      const productDataForStorage: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'purchases' | 'averageRating' | 'reviewCount'> = {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        categoryId: data.categoryId,
        primaryImageId, // This will be the ID from IndexedDB
        additionalImageIds, // These will be IDs from IndexedDB
      };

      const newProduct = await dataService.addProduct(productDataForStorage);
      
      // If using Firestore, images saved with tempProductIdForImages might need their IDs updated if product.id is different
      // For local, this is fine as IDs are just strings.
      // For Firestore, a more robust solution would save images *after* product doc is created to use its real ID.
      // Or, store images in a way they can be associated later.
      // For now, assuming image IDs are self-contained and don't need updating based on product ID.

      let logDescription = `Created product "${newProduct.name}" (ID: ${newProduct.id.substring(0,8)}) with price $${newProduct.price.toFixed(2)} and stock ${newProduct.stock}.`;
      if (primaryImageId) logDescription += ' Primary image added.';
      if (additionalImageIds.length > 0) logDescription += ` ${additionalImageIds.length} additional image(s) added.`;


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
    } catch (error) {
      console.error("Error creating product:", error);
      toast({ title: "Error Creating Product", description: "Could not create the product. Please try again.", variant: "destructive" });
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
