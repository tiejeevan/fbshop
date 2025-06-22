
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Eye, Loader2, Search } from 'lucide-react';
import type { Product, Category } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProductImage } from '@/components/product/ProductImage';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const [isComponentLoading, setIsComponentLoading] = useState(true);


  const fetchProductsAndCategories = useCallback(async () => {
    if (isDataSourceLoading || !dataService) {
      setIsComponentLoading(true);
      return;
    }
    setIsComponentLoading(true);
    try {
      const fetchedProducts = await dataService.getProducts();
      const fetchedCategories = await dataService.getCategories();
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
    } catch (error) {
        console.error("Error fetching products/categories for admin:", error);
        toast({ title: "Error", description: "Could not load product or category data.", variant: "destructive" });
        setProducts([]);
        setCategories([]);
    } finally {
      setIsComponentLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchProductsAndCategories();
  }, [fetchProductsAndCategories]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const searchMatch = searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const categoryMatch = filterCategory === 'all' || product.categoryId === filterCategory;

      return searchMatch && categoryMatch;
    });
  }, [products, searchTerm, filterCategory]);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !currentUser || !dataService) {
        toast({ title: "Error", description: "Product data, admin session, or data service missing for deletion.", variant: "destructive" });
        setProductToDelete(null);
        return;
    }
    const productName = productToDelete.name;
    const productId = productToDelete.id;

    try {
      const success = await dataService.deleteProduct(productId);
      if (success) {
        await dataService.addActivityLog({
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          actorRole: 'admin',
          actionType: 'PRODUCT_DELETE',
          entityType: 'Product',
          entityId: productId,
          description: `Deleted product "${productName}" (ID: ${productId.substring(0,8)}...).`
        });
        toast({ title: "Product Deleted", description: `"${productName}" deleted.` });
        fetchProductsAndCategories(); // Re-fetch to update the list
      } else {
        toast({ title: "Error Deleting Product", description: "Failed to delete product from the data source.", variant: "destructive" });
      }
    } catch (error) {
        console.error("Error during product deletion process:", error);
        toast({ title: "Error Deleting Product", description: "An unexpected error occurred.", variant: "destructive" });
    }
    setProductToDelete(null);
  };

  if (isDataSourceLoading || isComponentLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2"/> Loading products...
        </div>
    );
  }

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
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Filter and manage all products in the store.</CardDescription>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">
                {products.length > 0 ? "No products match your search." : "No products found."}
              </p>
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
                {filteredProducts.map((product) => (
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
                        <Link href={`/products/${product.id}`} className="hover:underline text-primary" target="_blank" rel="noopener noreferrer" title={`View ${product.name} on storefront (ID: ${product.id.substring(0,6)}...)`}>
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
                            <DropdownMenuItem asChild><Link href={`/products/${product.id}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer"><Eye className="mr-2 h-4 w-4" /> View</Link></DropdownMenuItem>
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
