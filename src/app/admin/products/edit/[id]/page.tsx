'use client';

import React, { useEffect, useState, useCallback, use } from 'react'; // Added use
import { ProductForm, ProductFormValues } from '../../ProductForm';
import type { Product, Category } from '@/types';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

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

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productIdFromParams = params.id;

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
    if (productIdFromParams) { 
      fetchInitialData(productIdFromParams);
    }
  }, [productIdFromParams, fetchInitialData]);

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
          const originalIdToReplace = imgInfo.type === 'primary' ? finalPrimaryImageId : (imgInfo.index !== undefined ? finalAdditionalImageIds[imgInfo.index] : null);
          if (originalIdToReplace) {
             await dataService.deleteImage(originalIdToReplace);
          }

          const savedImageId = await dataService.saveImage(
            id, 
            imgInfo.type === 'primary' ? 'primary' : (imgInfo.index?.toString() ?? Date.now().toString()),
            imgInfo.file
          );

          if (imgInfo.type === 'primary') {
            finalPrimaryImageId = savedImageId;
            imageChangeDescriptions.push(oldProductSnapshot.primaryImageId ? 'Primary image updated.' : 'Primary image added.');
          } else { 
            if (imgInfo.index !== undefined && imgInfo.index < finalAdditionalImageIds.length) {
              finalAdditionalImageIds[imgInfo.index] = savedImageId;
              imageChangeDescriptions.push(originalIdToReplace ? `Additional image at slot ${imgInfo.index + 1} updated.` : `Additional image added at slot ${imgInfo.index + 1}.`);
            } else { 
              finalAdditionalImageIds.push(savedImageId);
               imageChangeDescriptions.push('New additional image added.');
            }
          }
        }
      }
      finalAdditionalImageIds = [...new Set(finalAdditionalImageIds.filter(imgId => !!imgId))];

      const updatedProductData: Product = {
        ...oldProductSnapshot, 
        ...data, 
        id,
        primaryImageId: finalPrimaryImageId,
        additionalImageIds: finalAdditionalImageIds,
        updatedAt: new Date().toISOString(), 
      };

      await dataService.updateProduct(updatedProductData);

      const logDescription = await generateProductChangeDescription(oldProductSnapshot, data, imageChangeDescriptions, dataService);
      await dataService.addActivityLog({
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: 'admin',
        actionType: 'PRODUCT_UPDATE',
        entityType: 'Product',
        entityId: id,
        description: logDescription
      });

      toast({ title: "Product Updated", description: `"${data.name}" has been successfully updated.` });
      router.push('/admin/products');
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({ 
          title: "Error Updating Product", 
          description: error.message || "An unexpected error occurred.",
          variant: "destructive" 
      });
    }
  };

  if (isLoading || isDataSourceLoading || !productIdFromParams) { // Check unwrapped id
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
