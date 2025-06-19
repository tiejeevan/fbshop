
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();

  const fetchProductsAndCategories = useCallback(() => {
    setIsLoading(true);
    const fetchedProducts = localStorageService.getProducts();
    const fetchedCategories = localStorageService.getCategories();
    setProducts(fetchedProducts);
    setCategories(fetchedCategories);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProductsAndCategories();
  }, [fetchProductsAndCategories]);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  const handleDeleteProduct = () => {
    if (!productToDelete) return;
    const success = localStorageService.deleteProduct(productToDelete.id);
    if (success) {
      toast({ title: "Product Deleted", description: `"${productToDelete.name}" has been successfully deleted.` });
      fetchProductsAndCategories(); 
    } else {
      toast({ title: "Error Deleting Product", description: "Could not delete the product. Please try again.", variant: "destructive" });
    }
    setProductToDelete(null); 
  };
  

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary">Product Management</h1>
          <p className="text-muted-foreground">View, create, edit, and delete products.</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>A list of all products in your store.</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">No products found. Get started by adding a new product.</p>
              <Button asChild variant="secondary">
                <Link href="/admin/products/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Price</TableHead>
                  <TableHead className="hidden md:table-cell">Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const hasRealImage = product.imageUrl && !product.imageUrl.startsWith('https://placehold.co');
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="hidden sm:table-cell">
                        {hasRealImage ? (
                          <Image
                            alt={product.name}
                            className="aspect-square rounded-md object-cover"
                            height="64"
                            src={product.imageUrl}
                            width="64"
                            data-ai-hint="product thumbnail"
                          />
                        ) : product.icon ? (
                          <div 
                            className="w-16 h-16 flex items-center justify-center bg-muted rounded-md border" 
                            data-ai-hint="product icon"
                            style={{'--icon-cutout-bg': 'hsl(var(--muted))'} as React.CSSProperties}
                          >
                            <span
                              className={cn(product.icon, 'css-icon-base text-primary')}
                              style={{ transform: 'scale(1.2)' }}
                            >
                              {product.icon === 'css-icon-settings' && <span />}
                              {product.icon === 'css-icon-trash' && <i><em /></i>}
                            </span>
                          </div>
                        ) : (
                          <Image
                            alt={product.name}
                            className="aspect-square rounded-md object-cover"
                            height="64"
                            src={`https://placehold.co/64x64.png?text=${product.name.charAt(0)}`}
                            width="64"
                            data-ai-hint="product thumbnail placeholder"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryName(product.categoryId)}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">${product.price.toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/edit/${product.id}`} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/products/${product.id}`} target="_blank" className="cursor-pointer"> 
                                <Eye className="mr-2 h-4 w-4" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {productToDelete && (
        <AlertDialog open onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product
                "{productToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Yes, delete product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
