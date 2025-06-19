
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProductImage } from '@/components/product/ProductImage'; // Import new component

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

  const handleDeleteProduct = async () => { // Make async
    if (!productToDelete) return;
    const success = await localStorageService.deleteProduct(productToDelete.id); // Await the async operation
    if (success) {
      toast({ title: "Product Deleted", description: `"${productToDelete.name}" deleted.` });
      fetchProductsAndCategories();
    } else {
      toast({ title: "Error Deleting Product", variant: "destructive" });
    }
    setProductToDelete(null);
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary">Product Management</h1>
          <p className="text-muted-foreground">View, create, edit, and delete products.</p>
        </div>
        <Button asChild><Link href="/admin/products/new"><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>All Products</CardTitle><CardDescription>List of products.</CardDescription></CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">No products found.</p>
              <Button asChild variant="secondary"><Link href="/admin/products/new"><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Link></Button>
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
                {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="hidden sm:table-cell">
                        <ProductImage
                          imageId={product.primaryImageId}
                          alt={product.name}
                          className="w-16 h-16 rounded-md border"
                          imageClassName="object-cover"
                          width={64} height={64}
                          placeholderIconSize="w-8 h-8"
                          data-ai-hint="admin product thumbnail"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/products/${product.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                            {product.name}
                        </Link>
                      </TableCell>
                      <TableCell><Badge variant="outline">{getCategoryName(product.categoryId)}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">${product.price.toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/admin/products/edit/${product.id}`} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/products/${product.id}`} target="_blank" className="cursor-pointer"><Eye className="mr-2 h-4 w-4" /> View</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {productToDelete && (
        <AlertDialog open onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will delete "{productToDelete.name}". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    