
'use client';

import React, { useEffect, useState, use } from 'react';
import { ProductForm, ProductFormValues } from '../../ProductForm';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB, getImage } from '@/lib/indexedDbService';

export default function EditProductPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current admin user

  useEffect(() => {
    const fetchedProduct = localStorageService.findProductById(params.id);
    if (fetchedProduct) {
      setProduct(fetchedProduct);
    } else {
      toast({ title: "Product Not Found", description: "The product you are trying to edit does not exist.", variant: "destructive" });
      router.push('/admin/products');
    }
    setCategories(localStorageService.getCategories());
    setIsLoading(false);
  }, [params.id, router, toast]);

  const handleEditProduct = async (
    data: ProductFormValues,
    id?: string,
    imagesToSave?: {type: 'primary' | 'additional', index?: number, file: File}[],
    imagesToDelete?: string[]
  ) => {
    if (!id || !product || !currentUser) {
      toast({ title: "Error", description: "Product data or admin session missing.", variant: "destructive" });
      return;
    }

    try {
      let finalPrimaryImageId = product.primaryImageId;
      let finalAdditionalImageIds = [...(product.additionalImageIds || [])];

      
      if (imagesToDelete && imagesToDelete.length > 0) {
        for (const imgId of imagesToDelete) {
          await deleteImageFromDB(imgId);
        }
      }
      
      
      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          
          const savedImageId = await saveImageToDB(
            id, 
            imgInfo.type === 'primary' ? 'primary' : (imgInfo.index ?? Date.now()), 
            imgInfo.file
          );

          if (imgInfo.type === 'primary') {
            finalPrimaryImageId = savedImageId;
          } else {
            
            if (imgInfo.index !== undefined && finalAdditionalImageIds[imgInfo.index]) {
                finalAdditionalImageIds[imgInfo.index] = savedImageId;
            } else {
                finalAdditionalImageIds.push(savedImageId);
            }
          }
        }
      }
      
      
      const updatedProductData: Product = {
        ...product,
        ...data, 
        id,
        primaryImageId: finalPrimaryImageId,
        additionalImageIds: finalAdditionalImageIds.filter(imgId => !!imgId && !imagesToDelete?.includes(imgId)), 
      };

      localStorageService.updateProduct(updatedProductData);
      
      // Log the action
      localStorageService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'PRODUCT_UPDATE',
        entityType: 'Product',
        entityId: id,
        description: `Updated product "${data.name}" (ID: ${id.substring(0,8)}...).`
      });

      toast({ title: "Product Updated", description: `"${data.name}" has been successfully updated.` });
      router.push('/admin/products');
    } catch (error) {
      console.error("Error updating product:", error);
      toast({ title: "Error Updating Product", description: "Could not update the product. Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading product data...</div>;
  }

  if (!product) {
    return <div className="text-center py-10 text-destructive">Product not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Link>
      </Button>
      <ProductForm initialData={product} categories={categories} onFormSubmit={handleEditProduct} />
    </div>
  );
}
