
'use client';

import React, { useEffect, useState } from 'react';
import { ProductForm, ProductFormValues } from '../ProductForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category, Product } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService';

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setCategories(localStorageService.getCategories());
  }, []);

  const handleCreateProduct = async (
    data: ProductFormValues,
    _id?: string, // Not used for new product
    imagesToSave?: {type: 'primary' | 'additional', index?: number, file: File}[],
    _imagesToDelete?: string[] // Not used for new product
  ) => {
    try {
      let primaryImageId: string | null = null;
      const additionalImageIds: string[] = [];

      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          const savedImageId = await saveImageToDB(
            'new_product_placeholder_id', // Temp ID, real product ID not known yet
            imgInfo.type === 'primary' ? 'primary' : (imgInfo.index ?? 0),
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
        ...data,
        primaryImageId,
        additionalImageIds,
      };
      
      localStorageService.addProduct(productDataForStorage);
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
