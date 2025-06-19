
'use client';

import React, { useEffect, useState } from 'react';
import { ProductForm, ProductFormValues } from '../ProductForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category, Product } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB } from '@/lib/indexedDbService';

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    setCategories(localStorageService.getCategories());
  }, []);

  const handleCreateProduct = async (
    data: ProductFormValues,
    _id?: string,
    imagesToSave?: {type: 'primary' | 'additional', index?: number, file: File}[],
    _imageIdsMarkedForDeletionByUI?: string[]
  ) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Admin user not found.", variant: "destructive" });
      return;
    }
    try {
      let primaryImageId: string | null = null;
      const additionalImageIds: string[] = [];
      // Generate a temporary product ID for associating images before the actual product ID is created by localStorageService
      const tempProductIdForImages = `temp_product_${crypto.randomUUID()}`;

      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          const savedImageId = await saveImageToDB(
            tempProductIdForImages, // Use consistent ID for all images of this new product
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
        primaryImageId, // Use the ID saved from IndexedDB
        additionalImageIds, // Use the IDs saved from IndexedDB
      };

      const newProduct = localStorageService.addProduct(productDataForStorage);
      
      let logDescription = `Created product "${newProduct.name}" (ID: ${newProduct.id.substring(0,8)}) with price $${newProduct.price.toFixed(2)} and stock ${newProduct.stock}.`;
      if (primaryImageId) logDescription += ' Primary image added.';
      if (additionalImageIds.length > 0) logDescription += ` ${additionalImageIds.length} additional image(s) added.`;


      await localStorageService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
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
    