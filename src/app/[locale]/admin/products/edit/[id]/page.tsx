
'use client';

import React, { useEffect, useState, use } from 'react';
import { ProductForm, ProductFormValues } from '../../ProductForm';
import { localStorageService } from '@/lib/localStorageService';
import type { Product, Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService';

// Helper to generate detailed change descriptions
const generateProductChangeDescription = (oldProduct: Product, newData: ProductFormValues, imageChanges: string[]): string => {
  const changes: string[] = [];
  if (oldProduct.name !== newData.name) {
    changes.push(`Name changed from "${oldProduct.name}" to "${newData.name}".`);
  }
  if (oldProduct.description !== newData.description) {
    changes.push('Description updated.'); // Keep it concise for long text
  }
  if (oldProduct.price !== newData.price) {
    changes.push(`Price changed from $${oldProduct.price.toFixed(2)} to $${newData.price.toFixed(2)}.`);
  }
  if (oldProduct.stock !== newData.stock) {
    changes.push(`Stock changed from ${oldProduct.stock} to ${newData.stock}.`);
  }
  if (oldProduct.categoryId !== newData.categoryId) {
    const oldCategoryName = localStorageService.findCategoryById(oldProduct.categoryId)?.name || 'N/A';
    const newCategoryName = localStorageService.findCategoryById(newData.categoryId)?.name || 'N/A';
    changes.push(`Category changed from "${oldCategoryName}" to "${newCategoryName}".`);
  }
  changes.push(...imageChanges);

  if (changes.length === 0) {
    return `No significant changes detected for product "${newData.name}".`;
  }
  return `Updated product "${newData.name}": ${changes.join(' ')}`;
};


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
    imageIdsMarkedForDeletionByUI?: string[] // IDs of images explicitly removed via UI (preview cleared)
  ) => {
    if (!id || !product || !currentUser) {
      toast({ title: "Error", description: "Product data or admin session missing.", variant: "destructive" });
      return;
    }

    const oldProductSnapshot = { ...product }; // Capture state before any changes
    let imageChangeDescriptions: string[] = [];

    try {
      let finalPrimaryImageId = product.primaryImageId;
      let finalAdditionalImageIds = [...(product.additionalImageIds || [])];

      // 1. Handle images marked for deletion by UI (preview cleared, file removed)
      if (imageIdsMarkedForDeletionByUI && imageIdsMarkedForDeletionByUI.length > 0) {
        for (const imgId of imageIdsMarkedForDeletionByUI) {
          await deleteImageFromDB(imgId);
          if (finalPrimaryImageId === imgId) {
            finalPrimaryImageId = null;
            imageChangeDescriptions.push('Primary image removed.');
          }
          const_additional_idx = finalAdditionalImageIds.indexOf(imgId);
          if (const_additional_idx > -1) {
            finalAdditionalImageIds.splice(const_additional_idx, 1);
            imageChangeDescriptions.push(`Additional image (ID: ${imgId.substring(0,6)}...) removed.`);
          }
        }
      }

      // 2. Handle new/replacement images
      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          const savedImageId = await saveImageToDB(
            id,
            imgInfo.type === 'primary' ? 'primary' : (imgInfo.index?.toString() ?? Date.now().toString()),
            imgInfo.file
          );

          if (imgInfo.type === 'primary') {
            if (oldProductSnapshot.primaryImageId && oldProductSnapshot.primaryImageId !== savedImageId) {
              // If there was an old primary image and it's different from the new one, delete it.
              // This handles replacement. If old was null, this is a new addition.
              if (!imageIdsMarkedForDeletionByUI?.includes(oldProductSnapshot.primaryImageId)) { // Avoid double deletion
                 await deleteImageFromDB(oldProductSnapshot.primaryImageId);
              }
            }
            finalPrimaryImageId = savedImageId;
            imageChangeDescriptions.push(oldProductSnapshot.primaryImageId ? 'Primary image updated.' : 'Primary image added.');
          } else { // Additional image
            if (imgInfo.index !== undefined && imgInfo.index < finalAdditionalImageIds.length) {
              // Replacing an existing additional image at a specific index
              const oldImgIdAtIndex = finalAdditionalImageIds[imgInfo.index];
              if (oldImgIdAtIndex && oldImgIdAtIndex !== savedImageId) {
                 if (!imageIdsMarkedForDeletionByUI?.includes(oldImgIdAtIndex)) {
                    await deleteImageFromDB(oldImgIdAtIndex);
                 }
              }
              finalAdditionalImageIds[imgInfo.index] = savedImageId;
              imageChangeDescriptions.push(oldImgIdAtIndex ? `Additional image at slot ${imgInfo.index + 1} updated.` : `Additional image added at slot ${imgInfo.index + 1}.`);
            } else {
              // Adding a new additional image (or slot was empty)
              finalAdditionalImageIds.push(savedImageId);
               imageChangeDescriptions.push('New additional image added.');
            }
          }
        }
      }
      // Ensure no duplicates and filter out nulls (though saveImageToDB should always return string)
      finalAdditionalImageIds = [...new Set(finalAdditionalImageIds.filter(imgId => !!imgId))];


      const updatedProductData: Product = {
        ...oldProductSnapshot,
        ...data,
        id,
        primaryImageId: finalPrimaryImageId,
        additionalImageIds: finalAdditionalImageIds,
        updatedAt: new Date().toISOString(),
      };

      localStorageService.updateProduct(updatedProductData);

      const logDescription = generateProductChangeDescription(oldProductSnapshot, data, imageChangeDescriptions);
      await localStorageService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'PRODUCT_UPDATE',
        entityType: 'Product',
        entityId: id,
        description: logDescription
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
    
