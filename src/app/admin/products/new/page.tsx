'use client';

import React, { useEffect, useState } from 'react';
import { ProductForm, ProductFormValues } from '../ProductForm';
import { localStorageService } from '@/lib/localStorage';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setCategories(localStorageService.getCategories());
  }, []);

  const handleCreateProduct = async (data: ProductFormValues) => {
    try {
      localStorageService.addProduct({
        ...data,
        imageUrl: data.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(data.name)}`, // Default placeholder if empty
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
