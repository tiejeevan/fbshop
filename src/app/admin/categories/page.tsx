
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Search, Filter, ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { Category, Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/product/ProductImage';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/contexts/DataSourceContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';


interface DisplayCategory extends Category {
  level: number;
  productCount: number;
  children?: DisplayCategory[];
  isExpanded?: boolean;
}

export default function AdminCategoriesPage() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isComponentLoading, setIsComponentLoading] = useState(true);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [productsInDeletingCategory, setProductsInDeletingCategory] = useState<Product[]>([]);
  const [deleteProductsOption, setDeleteProductsOption] = useState<'reassign' | 'delete'>('reassign');
  const [categoriesToBatchAction, setCategoriesToBatchAction] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterHierarchy, setFilterHierarchy] = useState<'all' | 'toplevel' | 'subcategories'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBatchActionLoading, setIsBatchActionLoading] = useState(false);

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchData = useCallback(async () => {
    if (isDataSourceLoading || !dataService) {
      setIsComponentLoading(true);
      return;
    }
    setIsComponentLoading(true);
    try {
      const [fetchedCategories, fetchedProducts] = await Promise.all([
        dataService.getCategories(),
        dataService.getProducts()
      ]);
      setAllCategories(fetchedCategories);
      setAllProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching categories/products for admin:", error);
      toast({ title: "Error", description: "Could not load category or product data.", variant: "destructive" });
      setAllCategories([]);
      setAllProducts([]);
    } finally {
      setIsComponentLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const filteredAndStructuredCategories = useMemo(() => {
    let filtered = allCategories.filter(cat => {
      const nameMatch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const descriptionMatch = cat.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const searchMatch = searchTerm ? (nameMatch || descriptionMatch) : true;
      const statusMatch = filterStatus === 'all' || (filterStatus === 'active' && cat.isActive) || (filterStatus === 'inactive' && !cat.isActive);
      const hierarchyMatch = filterHierarchy === 'all' ||
                             (filterHierarchy === 'toplevel' && !cat.parentId) ||
                             (filterHierarchy === 'subcategories' && !!cat.parentId);
      return searchMatch && statusMatch && hierarchyMatch;
    });

    const buildHierarchy = (parentId: string | null, level: number, currentProducts: Product[]): DisplayCategory[] => {
      return filtered
        .filter(cat => cat.parentId === parentId)
        .sort((a,b) => a.displayOrder - b.displayOrder)
        .map(cat => ({
          ...cat,
          level,
          productCount: currentProducts.filter(p => p.categoryId === cat.id).length,
          children: buildHierarchy(cat.id, level + 1, currentProducts),
          isExpanded: expandedCategories[cat.id] === undefined ? true : expandedCategories[cat.id],
        }));
    };

    return buildHierarchy(null, 0, allProducts);

  }, [allCategories, allProducts, searchTerm, filterStatus, filterHierarchy, expandedCategories]);

  const handleDeleteClick = (category: Category) => {
    const productsInCategory = allProducts.filter(p => p.categoryId === category.id);
    setProductsInDeletingCategory(productsInCategory);
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete || !currentUser || !dataService) return;
    setIsDeleting(true);

    const children = await dataService.getChildCategories(categoryToDelete.id);
    if (children.length > 0) {
        toast({ title: "Cannot Delete", description: `Category "${categoryToDelete.name}" has ${children.length} subcategories. Please reassign or delete them first.`, variant: "destructive", duration: 5000 });
        setCategoryToDelete(null);
        setIsDeleting(false);
        return;
    }

    try {
      if (productsInDeletingCategory.length > 0) {
        if (deleteProductsOption === 'reassign') {
          let unassignedCategory = allCategories.find(c => c.name.toLowerCase() === 'unassigned');
          if (!unassignedCategory) {
            unassignedCategory = await dataService.addCategory({ name: 'Unassigned', slug: 'unassigned', description: 'Products without a specific category.', parentId: null, imageId: null, displayOrder: 999, isActive: true });
            fetchData(); 
          }
          await dataService.reassignProductsToCategory(productsInDeletingCategory.map(p => p.id), unassignedCategory.id);
        } else {
          await Promise.all(productsInDeletingCategory.map(p => dataService.deleteProduct(p.id)));
        }
      }

      const categoryName = categoryToDelete.name;
      const categoryId = categoryToDelete.id;

      const success = await dataService.deleteCategory(categoryId);
      if (success) {
        let logDescription = `Deleted category "${categoryName}" (ID: ${categoryId.substring(0,8)}...).`;
        if (productsInDeletingCategory.length > 0) {
            logDescription += deleteProductsOption === 'delete' 
                ? ` Deleted ${productsInDeletingCategory.length} associated products.` 
                : ` Reassigned ${productsInDeletingCategory.length} products to Unassigned.`;
        }

        await dataService.addActivityLog({
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          actorRole: 'admin',
          actionType: 'CATEGORY_DELETE',
          entityType: 'Category',
          entityId: categoryId,
          description: logDescription
        });
        toast({ title: "Category Deleted" });
        fetchData();
        setCategoriesToBatchAction(prev => prev.filter(id => id !== categoryId));
      } else {
        toast({ title: "Error Deleting Category", variant: "destructive" });
      }
    } catch (e) {
        console.error("Error during category deletion process:", e);
        toast({ title: "Error", description: "An unexpected error occurred during deletion.", variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setCategoryToDelete(null);
        setProductsInDeletingCategory([]);
    }
  };


  const handleBatchAction = async (action: 'delete' | 'setActive' | 'setInactive') => {
    if (categoriesToBatchAction.length === 0 || !currentUser || !dataService) {
      toast({ title: "No categories selected or admin not found", variant: "destructive" });
      return;
    }
    setIsBatchActionLoading(true);

    let successCount = 0;
    let skippedCount = 0;
    let skippedMessages: string[] = [];
    const affectedCategoryNames: string[] = [];

    for (const catId of categoriesToBatchAction) {
      const category = allCategories.find(c => c.id === catId);
      if (!category) continue;

      if (action === 'delete') {
        const children = await dataService.getChildCategories(catId);
        const products = allProducts.filter(p => p.categoryId === catId);
        if (children.length > 0 || products.length > 0) {
          skippedCount++;
          let reason = "";
          if (children.length > 0) reason += `${children.length} subcategories`;
          if (products.length > 0) reason += `${children.length > 0 ? ' and ' : ''}${products.length} products`;
          skippedMessages.push(`Skipped "${category.name}": Has ${reason}.`);
          continue;
        }
        if (await dataService.deleteCategory(catId)) {
            successCount++;
            affectedCategoryNames.push(category.name);
        }
      } else if (action === 'setActive') {
        await dataService.updateCategory({ ...category, isActive: true, updatedAt: new Date().toISOString() });
        successCount++;
        affectedCategoryNames.push(category.name);
      } else if (action === 'setInactive') {
        await dataService.updateCategory({ ...category, isActive: false, updatedAt: new Date().toISOString() });
        successCount++;
        affectedCategoryNames.push(category.name);
      }
    }

    if (successCount > 0 || skippedCount > 0) {
        let logDescription = '';
        if (action === 'delete') {
            logDescription = `Batch delete: Attempted ${categoriesToBatchAction.length} categories. Successfully deleted ${successCount} (${affectedCategoryNames.slice(0,3).join(', ')}${affectedCategoryNames.length > 3 ? '...' : ''}).`;
            if (skippedCount > 0) logDescription += ` Skipped ${skippedCount}.`;
        } else if (action === 'setActive') {
            logDescription = `Batch set ${successCount} categories to active: ${affectedCategoryNames.slice(0,3).join(', ')}${affectedCategoryNames.length > 3 ? '...' : ''}.`;
        } else if (action === 'setInactive') {
            logDescription = `Batch set ${successCount} categories to inactive: ${affectedCategoryNames.slice(0,3).join(', ')}${affectedCategoryNames.length > 3 ? '...' : ''}.`;
        }
        await dataService.addActivityLog({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: 'admin',
            actionType: `CATEGORY_BATCH_${action.toUpperCase()}`,
            entityType: 'Category',
            description: logDescription
        });
    }

    if (skippedCount > 0) {
        toast({
            title: `Batch Action: ${successCount} affected, ${skippedCount} skipped`,
            description: ( <div className="text-xs max-h-20 overflow-y-auto">{skippedMessages.map((msg, i) => <p key={i}>{msg}</p>)}</div> ),
            variant: successCount > 0 ? "default" : "destructive", duration: 7000
        });
    } else if (successCount > 0) {
        toast({ title: "Batch Action Complete", description: `${successCount} categories affected.` });
    } else {
        toast({ title: "Batch Action", description: "No categories were affected."})
    }
    fetchData(); // Refetch all data
    setCategoriesToBatchAction([]);
    setIsBatchActionLoading(false);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIds: string[] = [];
      const collectVisibleIds = (cats: DisplayCategory[]) => {
          cats.forEach(c => {
              visibleIds.push(c.id);
              if (c.children && c.isExpanded) collectVisibleIds(c.children);
          });
      };
      collectVisibleIds(filteredAndStructuredCategories);
      setCategoriesToBatchAction(visibleIds);
    } else {
      setCategoriesToBatchAction([]);
    }
  };

  const isAllVisibleSelected = useMemo(() => {
    const visibleIds: string[] = [];
    const collectVisibleIds = (cats: DisplayCategory[]) => {
        cats.forEach(c => {
            visibleIds.push(c.id);
            if (c.children && c.isExpanded) collectVisibleIds(c.children);
        });
    };
    collectVisibleIds(filteredAndStructuredCategories);
    if (visibleIds.length === 0) return false;
    return visibleIds.every(id => categoriesToBatchAction.includes(id));
  }, [filteredAndStructuredCategories, categoriesToBatchAction]);

  const renderCategoryRow = (category: DisplayCategory) => (
    <React.Fragment key={category.id}>
      <TableRow className={cn(category.parentId && "bg-muted/30")}>
        <TableCell style={{ paddingLeft: `${category.level * 1.5 + 0.5}rem` }}>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={categoriesToBatchAction.includes(category.id)}
              onCheckedChange={(checkedState) => {
                const isChecked = !!checkedState;
                setCategoriesToBatchAction(prev =>
                  isChecked ? [...prev, category.id] : prev.filter(id => id !== category.id)
                );
              }}
              aria-label={`Select category ${category.name}`}
            />
            {category.children && category.children.length > 0 ? (
              <Button variant="ghost" size="icon" onClick={() => toggleExpand(category.id)} className="p-1 h-6 w-6">
                {category.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : <span className="w-6 inline-block shrink-0"></span>}
             <ProductImage imageId={category.imageId} alt={category.name} className="w-10 h-10 rounded-sm border shrink-0" imageClassName="object-contain" placeholderIconSize="w-5 h-5" data-ai-hint="category list"/>
            <Link href={`/admin/categories/edit/${category.id}`} className="font-medium hover:underline ml-1 truncate" title={category.name}>{category.name}</Link>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-xs">{category.description || 'N/A'}</TableCell>
        <TableCell className="hidden sm:table-cell">{category.productCount}</TableCell>
        <TableCell className="hidden md:table-cell">{category.displayOrder}</TableCell>
        <TableCell>
          <Badge variant={category.isActive ? "default" : "outline"} className={cn("text-xs", category.isActive ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700" : "bg-red-100 text-red-700 border-red-300 dark:bg-red-800/30 dark:text-red-300 dark:border-red-700")}>
             {category.isActive ? <CheckCircle className="mr-1 h-3 w-3"/> : <XCircle className="mr-1 h-3 w-3"/>}
             {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href={`/admin/categories/edit/${category.id}`} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteClick(category)} className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {category.isExpanded && category.children && category.children.map(child => renderCategoryRow(child))}
    </React.Fragment>
  );

  const currentLoadingState = isComponentLoading || isDataSourceLoading;

  if (currentLoadingState) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary">Category Management</h1>
          <p className="text-muted-foreground">Organize product categories, manage hierarchy, and more.</p>
        </div>
        <Button asChild><Link href="/admin/categories/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New</Link></Button>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Filters & Batch Actions</CardTitle>
           <div className="flex flex-col sm:flex-row gap-2 mt-2 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search categories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full" />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
            <Select value={filterHierarchy} onValueChange={(v) => setFilterHierarchy(v as any)}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Hierarchy" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Levels</SelectItem><SelectItem value="toplevel">Top-level Only</SelectItem><SelectItem value="subcategories">Subcategories Only</SelectItem></SelectContent>
            </Select>
          </div>
           {categoriesToBatchAction.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center border-t pt-4">
                <span className="text-sm text-muted-foreground">{categoriesToBatchAction.length} selected:</span>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction('setActive')} disabled={isBatchActionLoading}>{isBatchActionLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}Set Active</Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction('setInactive')} disabled={isBatchActionLoading}>{isBatchActionLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}Set Inactive</Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="destructive" className="bg-destructive hover:bg-destructive/90" disabled={isBatchActionLoading}>{isBatchActionLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}<Trash2 className="mr-2 h-3 w-3"/> Delete Selected</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Selected Categories?</AlertDialogTitle><AlertDialogDescription>This will attempt to delete {categoriesToBatchAction.length} categories. Categories with products or subcategories will be skipped. This action cannot be undone for successfully deleted categories.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleBatchAction('delete')} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Confirm Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          {allCategories.length === 0 ? (
            <div className="text-center py-10"><p className="text-muted-foreground mb-4">No categories yet.</p><Button asChild variant="secondary"><Link href="/admin/categories/new"><PlusCircle className="mr-2 h-4 w-4" /> Add First Category</Link></Button></div>
          ) : filteredAndStructuredCategories.length === 0 && (searchTerm || filterStatus !== 'all' || filterHierarchy !== 'all') ? (
             <div className="text-center py-10"><p className="text-muted-foreground mb-4">No categories match your search/filters.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px] sm:w-[40%]">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isAllVisibleSelected && filteredAndStructuredCategories.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all visible categories"
                          disabled={filteredAndStructuredCategories.length === 0}
                        /> Name
                      </div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell min-w-[200px]">Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Products</TableHead>
                    <TableHead className="hidden md:table-cell">Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndStructuredCategories.length > 0 ?
                      filteredAndStructuredCategories.map(category => renderCategoryRow(category)) :
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No categories match your filters.</TableCell></TableRow>
                  }
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {categoryToDelete && (
        <AlertDialog open onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete "{categoryToDelete.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                    {productsInDeletingCategory.length > 0 ?
                        `This category contains ${productsInDeletingCategory.length} product(s). What would you like to do with them?` :
                        `This will permanently delete the category. This action cannot be undone.`
                    }
                </AlertDialogDescription>
            </AlertDialogHeader>
            {productsInDeletingCategory.length > 0 && (
                <RadioGroup defaultValue="reassign" onValueChange={(value) => setDeleteProductsOption(value as 'reassign' | 'delete')} className="my-4 space-y-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reassign" id="reassign-products" />
                        <Label htmlFor="reassign-products">Reassign products to "Unassigned"</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="delete" id="delete-products" />
                        <Label htmlFor="delete-products">Delete all products in this category</Label>
                    </div>
                </RadioGroup>
            )}
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteCategory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
