
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { localStorageService } from '@/lib/localStorage';
import type { Category } from '@/types';
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const { toast } = useToast();

  const fetchCategories = useCallback(() => {
    setIsLoading(true);
    const fetchedCategories = localStorageService.getCategories();
    setCategories(fetchedCategories);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;
    
    // Check if any products are using this category
    const productsUsingCategory = localStorageService.getProducts().filter(p => p.categoryId === categoryToDelete.id);
    if (productsUsingCategory.length > 0) {
        toast({ title: "Cannot Delete Category", description: `Category "${categoryToDelete.name}" is in use by ${productsUsingCategory.length} product(s). Please reassign them before deleting.`, variant: "destructive", duration: 5000 });
        setCategoryToDelete(null);
        return;
    }

    const success = localStorageService.deleteCategory(categoryToDelete.id);
    if (success) {
      toast({ title: "Category Deleted", description: `"${categoryToDelete.name}" has been successfully deleted.` });
      fetchCategories(); // Refresh list
    } else {
      toast({ title: "Error Deleting Category", description: "Could not delete the category. It might be in use or not found.", variant: "destructive" });
    }
    setCategoryToDelete(null); // Close dialog
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary">Category Management</h1>
          <p className="text-muted-foreground">View, create, edit, and delete product categories.</p>
        </div>
        <Button asChild>
          <Link href="/admin/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>A list of all product categories in your store.</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">No categories found. Get started by adding a new category.</p>
              <Button asChild variant="secondary">
                <Link href="/admin/categories/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="hidden md:table-cell">Products</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const productCount = localStorageService.getProducts().filter(p => p.categoryId === category.id).length;
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-xs">{category.description || 'N/A'}</TableCell>
                       <TableCell className="hidden md:table-cell">{productCount}</TableCell>
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
                              <Link href={`/admin/categories/edit/${category.id}`} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setCategoryToDelete(category)} 
                              className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                              disabled={productCount > 0}
                            >
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
      
      {categoryToDelete && (
        <AlertDialog open onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the category
                "{categoryToDelete.name}".
                {localStorageService.getProducts().filter(p => p.categoryId === categoryToDelete.id).length > 0 && 
                  <span className="block mt-2 font-semibold text-destructive">This category still has products associated with it. Deleting it is disabled.</span>
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCategory} 
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={localStorageService.getProducts().filter(p => p.categoryId === categoryToDelete.id).length > 0}
              >
                Yes, delete category
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
