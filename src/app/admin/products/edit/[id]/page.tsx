
'use client';

import React, { useEffect, useState, use } from 'react'; // Import use
import { ProductForm, ProductFormValues } from '../../ProductForm';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditProductPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) { // Update props
  const params = use(paramsPromise); // Resolve params
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchedProduct = localStorageService.findProductById(params.id); // Use resolved params.id
    if (fetchedProduct) {
      setProduct(fetchedProduct);
    } else {
      toast({ title: "Product Not Found", description: "The product you are trying to edit does not exist.", variant: "destructive" });
      router.push('/admin/products');
    }
    setCategories(localStorageService.getCategories());
    setIsLoading(false);
  }, [params.id, router, toast]); // Update dependency array

  const handleEditProduct = async (data: ProductFormValues, id?: string) => {
    if (!id) return; 
    try {
      const updatedProductData: Product = {
        ...(product as Product), 
        ...data,
        id,
        imageUrl: data.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(data.name)}`,
      };
      localStorageService.updateProduct(updatedProductData);
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
