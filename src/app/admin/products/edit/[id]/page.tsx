
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ProductForm, ProductFormValues } from '../../ProductForm';
import type { Product, Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';
// Removed: import { saveImage as saveImageToDB, deleteImage as deleteImageFromDB } from '@/lib/indexedDbService'; - Handled by dataService

const generateProductChangeDescription = async (
  oldProduct: Product,
  newData: ProductFormValues,
  imageChanges: string[],
  dataService: any // Pass dataService to fetch category names
): Promise<string> => {
  const changes: string[] = [];
  if (oldProduct.name !== newData.name) {
    changes.push(`Name changed from "${oldProduct.name}" to "${newData.name}".`);
  }
  if (oldProduct.description !== newData.description) {
    changes.push('Description updated.');
  }
  if (oldProduct.price !== newData.price) {
    changes.push(`Price changed from $${oldProduct.price.toFixed(2)} to $${newData.price.toFixed(2)}.`);
  }
  if (oldProduct.stock !== newData.stock) {
    changes.push(`Stock changed from ${oldProduct.stock} to ${newData.stock}.`);
  }
  if (oldProduct.categoryId !== newData.categoryId) {
    const oldCategory = await dataService.findCategoryById(oldProduct.categoryId);
    const newCategory = await dataService.findCategoryById(newData.categoryId);
    const oldCategoryName = oldCategory?.name || 'N/A';
    const newCategoryName = newCategory?.name || 'N/A';
    changes.push(`Category changed from "${oldCategoryName}" to "${newCategoryName}".`);
  }
  changes.push(...imageChanges);

  if (changes.length === 0) {
    return `No significant changes detected for product "${newData.name}".`;
  }
  return `Updated product "${newData.name}": ${changes.join(' ')}`;
};


export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchInitialData = useCallback(async (productId: string) => {
     if (isDataSourceLoading || !dataService) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedProduct, fetchedCategories] = await Promise.all([
        dataService.findProductById(productId),
        dataService.getCategories()
      ]);
      
      if (fetchedProduct) {
        setProduct(fetchedProduct);
      } else {
        toast({ title: "Product Not Found", description: "The product you are trying to edit does not exist.", variant: "destructive" });
        router.push('/admin/products');
      }
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching product/category data:", error);
      toast({ title: "Error", description: "Could not load product or category data.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, router, toast]);

  useEffect(() => {
    if (params?.id) {
      fetchInitialData(params.id);
    }
  }, [params, fetchInitialData]);

  const handleEditProduct = async (
    data: ProductFormValues,
    id?: string,
    imagesToSave?: {type: 'primary' | 'additional', index?: number, file: File}[],
    imageIdsMarkedForDeletionByUI?: string[]
  ) => {
    if (!id || !product || !currentUser || !dataService) {
      toast({ title: "Error", description: "Product data, admin session or data service missing.", variant: "destructive" });
      return;
    }

    const oldProductSnapshot = { ...product };
    let imageChangeDescriptions: string[] = [];

    try {
      let finalPrimaryImageId = product.primaryImageId;
      let finalAdditionalImageIds = [...(product.additionalImageIds || [])];

      if (imageIdsMarkedForDeletionByUI && imageIdsMarkedForDeletionByUI.length > 0) {
        for (const imgId of imageIdsMarkedForDeletionByUI) {
          await dataService.deleteImage(imgId);
          if (finalPrimaryImageId === imgId) {
            finalPrimaryImageId = null;
            imageChangeDescriptions.push('Primary image removed.');
          }
          const additionalIdx = finalAdditionalImageIds.indexOf(imgId);
          if (additionalIdx > -1) {
            finalAdditionalImageIds.splice(additionalIdx, 1);
            imageChangeDescriptions.push(`Additional image (ID: ${imgId.substring(0,6)}...) removed.`);
          }
        }
      }

      if (imagesToSave && imagesToSave.length > 0) {
        for (const imgInfo of imagesToSave) {
          const savedImageId = await dataService.saveImage(
            id, // Use the actual product ID as entityId
            imgInfo.type === 'primary' ? 'primary' : (imgInfo.index?.toString() ?? Date.now().toString()),
            imgInfo.file
          );

          if (imgInfo.type === 'primary') {
            // If there was an old primary image and it wasn't marked for deletion by UI, delete it now
            if (oldProductSnapshot.primaryImageId && oldProductSnapshot.primaryImageId !== savedImageId && !imageIdsMarkedForDeletionByUI?.includes(oldProductSnapshot.primaryImageId)) {
                 await dataService.deleteImage(oldProductSnapshot.primaryImageId);
            }
            finalPrimaryImageId = savedImageId;
            imageChangeDescriptions.push(oldProductSnapshot.primaryImageId ? 'Primary image updated.' : 'Primary image added.');
          } else { 
            // For additional images, if replacing an existing one at a specific index
            if (imgInfo.index !== undefined && imgInfo.index < finalAdditionalImageIds.length) {
              const oldImgIdAtIndex = finalAdditionalImageIds[imgInfo.index];
              if (oldImgIdAtIndex && oldImgIdAtIndex !== savedImageId && !imageIdsMarkedForDeletionByUI?.includes(oldImgIdAtIndex)) {
                  await dataService.deleteImage(oldImgIdAtIndex);
              }
              finalAdditionalImageIds[imgInfo.index] = savedImageId;
              imageChangeDescriptions.push(oldImgIdAtIndex ? `Additional image at slot ${imgInfo.index + 1} updated.` : `Additional image added at slot ${imgInfo.index + 1}.`);
            } else { // If it's a new additional image or being appended
              finalAdditionalImageIds.push(savedImageId);
               imageChangeDescriptions.push('New additional image added.');
            }
          }
        }
      }
      // Ensure no duplicate image IDs in additional images
      finalAdditionalImageIds = [...new Set(finalAdditionalImageIds.filter(imgId => !!imgId))];


      const updatedProductData: Product = {
        ...oldProductSnapshot, // Keep createdAt, views, purchases, etc.
        ...data, // Apply form data
        id,
        primaryImageId: finalPrimaryImageId,
        additionalImageIds: finalAdditionalImageIds,
        updatedAt: new Date().toISOString(), // Will be set by service if it uses serverTimestamp
      };

      await dataService.updateProduct(updatedProductData);

      const logDescription = await generateProductChangeDescription(oldProductSnapshot, data, imageChangeDescriptions, dataService);
      await dataService.addAdminActionLog({
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

  if (isLoading || isDataSourceLoading || !params?.id) {
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
