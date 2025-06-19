
'use client';

import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2 } from 'lucide-react';
import { suggestProductCategories, SuggestProductCategoriesInput } from '@/ai/flows/suggest-product-categories';
import Link from 'next/link';
import { IconPicker, type CssIconClassName } from '@/components/shared/IconPicker';

const productSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL' }).optional().or(z.literal('')),
  price: z.coerce.number().min(0.01, { message: 'Price must be greater than 0' }),
  stock: z.coerce.number().min(0, { message: 'Stock cannot be negative' }).int(),
  categoryId: z.string().min(1, { message: 'Please select a category' }),
  icon: z.string().optional().nullable().default(null), 
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  categories: Category[];
  onFormSubmit: (data: ProductFormValues, id?: string) => Promise<void>;
}

export function ProductForm({ initialData, categories, onFormSubmit }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    control, 
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          imageUrl: initialData.imageUrl || '',
          icon: initialData.icon || null, 
        }
      : {
          name: '',
          description: '',
          imageUrl: '',
          price: 0,
          stock: 0,
          categoryId: '',
          icon: null,
        },
  });
  
  const productDescription = watch('description');
  const currentIconCssClass = watch('icon') as CssIconClassName;

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('description', initialData.description);
      setValue('imageUrl', initialData.imageUrl || '');
      setValue('price', initialData.price);
      setValue('stock', initialData.stock);
      setValue('categoryId', initialData.categoryId);
      setValue('icon', initialData.icon || null);
    }
  }, [initialData, setValue]);

  const handleSuggestCategories = async () => {
    if (!productDescription || productDescription.length < 10) {
      toast({ title: "Cannot Suggest", description: "Please enter a product description (min 10 characters).", variant: "destructive" });
      return;
    }
    setIsSuggestingCategories(true);
    setSuggestedCategories([]);
    try {
      const input: SuggestProductCategoriesInput = { productDescription };
      const result = await suggestProductCategories(input);
      
      const newSuggestedCategories = (result && Array.isArray(result.categories)) ? result.categories : [];

      if (newSuggestedCategories.length > 0) {
        setSuggestedCategories(newSuggestedCategories);
        toast({ title: "Categories Suggested", description: "AI has suggested some categories for you." });
      } else {
        setSuggestedCategories([]); 
        toast({ title: "No Suggestions", description: "AI could not suggest categories for this description." });
      }
    } catch (error) {
      console.error("Error suggesting categories:", error);
      setSuggestedCategories([]); 
      toast({ title: "Suggestion Error", description: "Could not get AI category suggestions.", variant: "destructive" });
    } finally {
      setIsSuggestingCategories(false);
    }
  };

  const handleIconSelection = useCallback((iconClassName: CssIconClassName) => {
    setValue('icon', iconClassName, { shouldValidate: true });
  }, [setValue]);


  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      await onFormSubmit(data, initialData?.id);
    } catch (error) {
       // Error is handled by onFormSubmit and toast is shown there
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{initialData ? 'Edit Product' : 'Create New Product'}</CardTitle>
        <CardDescription>{initialData ? 'Update the details of this product.' : 'Fill in the form to add a new product to your store.'}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Premium T-Shirt" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Detailed description of the product..." rows={5} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          
          <Button type="button" variant="outline" onClick={handleSuggestCategories} disabled={isSuggestingCategories || !productDescription}>
            {isSuggestingCategories ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Suggest Categories with AI
          </Button>

          {suggestedCategories.length > 0 && (
            <div className="space-y-2 p-3 bg-accent/20 rounded-md">
              <p className="text-sm font-medium text-foreground">AI Suggested Categories:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedCategories.map((cat, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                        const existingCategory = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
                        if (existingCategory) {
                            setValue('categoryId', existingCategory.id, { shouldValidate: true });
                            toast({title: "Category Selected", description: `"${existingCategory.name}" selected.`});
                        } else {
                            toast({title: "New Category", description: `"${cat}" is a new category. You might need to create it first or choose an existing one.`, variant: "default"});
                        }
                    }}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
               <p className="text-xs text-muted-foreground">Click a suggestion to see if it matches an existing category or note it down to create a new one.</p>
            </div>
          )}


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" {...register('price')} placeholder="0.00" />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input id="stock" type="number" {...register('stock')} placeholder="0" />
              {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={initialData?.categoryId}>
                        <SelectTrigger id="categoryId">
                        <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                        {categories.length > 0 ? (
                            categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-categories" disabled>No categories available. Please create one first.</SelectItem>
                        )}
                        </SelectContent>
                    </Select>
                )}
            />
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
             {categories.length === 0 && <p className="text-xs text-muted-foreground">No categories found. <Link href="/admin/categories/new" className="underline">Create a category</Link>.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL (Optional)</Label>
            <Input id="imageUrl" {...register('imageUrl')} placeholder="https://example.com/image.png" />
            {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
             <p className="text-xs text-muted-foreground">Use a service like Placehold.co (e.g., https://placehold.co/600x400.png)</p>
          </div>

          <div className="space-y-2">
            <IconPicker selectedIconClassName={currentIconCssClass} onIconSelect={handleIconSelection} />
            {errors.icon && <p className="text-sm text-destructive">{errors.icon.message}</p>}
          </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || categories.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initialData ? 'Save Changes' : 'Create Product'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

    
