
'use client';

import React, { useEffect, useState, use } from 'react';
import { ProductForm, ProductFormValues } from '../../ProductForm';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; 
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService';

export default function EditProductPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth(); 

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
      let finalPrimaryImageId = data.primaryImageId; // Use ID from form data as base (RHF value)
      let finalAdditionalImageIds = [...(data.additionalImageIds || [])]; // Use IDs from form data

      // Handle deletions first
      if (imagesToDelete && imagesToDelete.length > 0) {
        for (const imgId of imagesToDelete) {
          await deleteImageFromDB(imgId);
          if (finalPrimaryImageId === imgId) finalPrimaryImageId = null;
          finalAdditionalImageIds = finalAdditionalImageIds.filter(fid => fid !== imgId);
        }
      }
      
      // Handle new/replacement images
      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          const savedImageId = await saveImageToDB(
            id, 
            imgInfo.type === 'primary' ? 'primary' : (imgInfo.index?.toString() ?? Date.now().toString()), 
            imgInfo.file
          );

          if (imgInfo.type === 'primary') {
            // If there was an old primary image different from current and not in imagesToDelete, delete it
            if (product.primaryImageId && product.primaryImageId !== savedImageId && !imagesToDelete?.includes(product.primaryImageId)) {
                await deleteImageFromDB(product.primaryImageId);
            }
            finalPrimaryImageId = savedImageId;
          } else {
            // For additional images, if replacing, the old ID should have been in imagesToDelete
            // If adding new, just push
            if (imgInfo.index !== undefined && finalAdditionalImageIds[imgInfo.index] && finalAdditionalImageIds[imgInfo.index] !== savedImageId && !imagesToDelete?.includes(finalAdditionalImageIds[imgInfo.index])) {
               // This case implies replacing an image not explicitly marked for deletion via UI but is being overwritten by a new file
               // The RHF value for additionalImageIds might not reflect this old ID if it was a file previously
               // For simplicity, if imagesToSave has an item, it implies it's new or replacing.
               // The `imagesToDelete` should ideally handle explicit UI-driven "remove" actions.
            }

            if (imgInfo.index !== undefined && imgInfo.index < finalAdditionalImageIds.length) {
                 // If there was an image at this slot and it's different from the new one, and wasn't in imagesToDelete, delete it.
                if(finalAdditionalImageIds[imgInfo.index] && finalAdditionalImageIds[imgInfo.index] !== savedImageId && !imagesToDelete?.includes(finalAdditionalImageIds[imgInfo.index])){
                    await deleteImageFromDB(finalAdditionalImageIds[imgInfo.index]);
                }
                finalAdditionalImageIds[imgInfo.index] = savedImageId;
            } else {
                finalAdditionalImageIds.push(savedImageId);
            }

          }
        }
      }
      
      const updatedProductData: Product = {
        ...product, // Start with original product data
        ...data,    // Overlay with form data (name, desc, price, stock, categoryId)
        id,         // Ensure ID is correct
        primaryImageId: finalPrimaryImageId, // Set the resolved primary image ID
        additionalImageIds: finalAdditionalImageIds.filter(imgId => !!imgId), // Set resolved additional image IDs
        updatedAt: new Date().toISOString(), // Update timestamp
      };

      localStorageService.updateProduct(updatedProductData);
      
      await localStorageService.addAdminActionLog({
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
