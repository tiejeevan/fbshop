'use client';

import React, { useEffect, useState, useCallback, ChangeEvent } from 'react';
import { useForm, SubmitHandler, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product, Category } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, PlusCircle, Trash2, ImagePlus, AlertTriangle, UploadCloud } from 'lucide-react';
import { suggestProductCategories, SuggestProductCategoriesInput } from '@/ai/flows/suggest-product-categories';
import { generateProductDescription } from '@/ai/flows/generate-product-description';
import Link from 'next/link';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/product/ProductImage';
import { useDataSource } from '@/contexts/DataSourceContext';

const MAX_TOTAL_IMAGES = 10;
const MAX_FILE_SIZE_MB = 0.5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const productSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  price: z.coerce.number().min(0.01, { message: 'Price must be greater than 0' }),
  stock: z.coerce.number().min(0, { message: 'Stock cannot be negative' }).int(),
  categoryId: z.string().min(1, { message: 'Please select a category' }),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  categories: Category[];
  onFormSubmit: (
    data: ProductFormValues,
    id?: string,
    imagesToSave?: {type: 'primary' | 'additional', index?: number, file: File}[],
    imageIdsMarkedForDeletionByUI?: string[]
  ) => Promise<void>;
}

interface ImageFileState {
  file: File | null;
  previewUrl: string | null;
  id: string | null; // This will hold the existing ID (from DB or Firestore URL)
}

export function ProductForm({ initialData, categories, onFormSubmit }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { dataSourceType } = useDataSource();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // States to manage images
  const [primaryImage, setPrimaryImage] = useState<ImageFileState>({ file: null, previewUrl: null, id: initialData?.primaryImageId || null });
  const [additionalImages, setAdditionalImages] = useState<ImageFileState[]>(
    (initialData?.additionalImageIds || []).map(id => ({ file: null, previewUrl: null, id }))
  );
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          ...initialData,
        }
      : {
          name: '',
          description: '',
          price: 0,
          stock: 0,
          categoryId: '',
        },
  });

  useEffect(() => {
    if (initialData) {
      setPrimaryImage({ file: null, previewUrl: null, id: initialData.primaryImageId || null });
      setAdditionalImages((initialData.additionalImageIds || []).map(id => ({ file: null, previewUrl: null, id })));
    }
  }, [initialData]);

  const productDescription = watch('description');
  const productName = watch('name');

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    imageType: 'primary' | 'additional',
    index?: number
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File Too Large", description: `Image size should not exceed ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select JPG, PNG, WEBP, or GIF.", variant: "destructive" });
        return;
    }
    event.target.value = ''; // Reset file input

    const previewUrl = URL.createObjectURL(file);

    if (imageType === 'primary') {
      if (primaryImage.previewUrl) URL.revokeObjectURL(primaryImage.previewUrl);
      setPrimaryImage(prev => ({ ...prev, file, previewUrl }));
    } else if (index !== undefined) {
      setAdditionalImages(prev => {
        const newFiles = [...prev];
        if (newFiles[index]?.previewUrl) URL.revokeObjectURL(newFiles[index].previewUrl!);
        newFiles[index] = { ...newFiles[index], file, previewUrl };
        return newFiles;
      });
    }
  };

  const addAdditionalImageSlot = () => {
    const totalImages = (primaryImage.id || primaryImage.file ? 1 : 0) + additionalImages.filter(img => img.id || img.file).length;
    if (totalImages < MAX_TOTAL_IMAGES) {
      setAdditionalImages(prev => [...prev, { file: null, previewUrl: null, id: null }]);
    } else {
      toast({ title: "Image Limit Reached", description: `Max ${MAX_TOTAL_IMAGES} total images.`, variant: "destructive"});
    }
  };

  const removeImage = (type: 'primary' | 'additional', index?: number) => {
    if (type === 'primary') {
      if (primaryImage.previewUrl) URL.revokeObjectURL(primaryImage.previewUrl);
      setPrimaryImage({ file: null, previewUrl: null, id: null });
    } else if (index !== undefined) {
      setAdditionalImages(prev => prev.filter((_, i) => {
        if (i === index && prev[i].previewUrl) URL.revokeObjectURL(prev[i].previewUrl!);
        return i !== index;
      }));
    }
  };

  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    setIsSubmitting(true);
    
    const imagesToSave: {type: 'primary' | 'additional', index?: number, file: File}[] = [];
    const imageIdsToDelete: string[] = [];

    // Check primary image
    if (primaryImage.file) {
      imagesToSave.push({ type: 'primary', file: primaryImage.file });
    }
    if (!primaryImage.file && !primaryImage.id && initialData?.primaryImageId) {
      imageIdsToDelete.push(initialData.primaryImageId);
    }
    
    // Check additional images
    const initialAdditionalIds = initialData?.additionalImageIds || [];
    additionalImages.forEach((imgState, index) => {
      if (imgState.file) {
        imagesToSave.push({ type: 'additional', index, file: imgState.file });
      }
    });

    initialAdditionalIds.forEach(id => {
      if (!additionalImages.some(img => img.id === id)) {
        imageIdsToDelete.push(id);
      }
    });
    
    try {
      await onFormSubmit(data, initialData?.id, imagesToSave, imageIdsToDelete);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestCategories = async () => {
    if (!productDescription || productDescription.length < 10) {
      toast({ title: "Cannot Suggest", description: "Please enter a product description (min 10 characters).", variant: "destructive" });
      return;
    }
    setIsSuggestingCategories(true); setSuggestedCategories([]);
    try {
      const result = await suggestProductCategories({ productDescription });
      const newSuggested = (result && Array.isArray(result.categories)) ? result.categories : [];
      if (newSuggested.length > 0) {
        setSuggestedCategories(newSuggested);
        toast({ title: "Categories Suggested" });
      } else {
        toast({ title: "No Suggestions", description: "AI could not suggest categories." });
      }
    } catch (error) {
      toast({ title: "Suggestion Error", variant: "destructive" });
    } finally {
      setIsSuggestingCategories(false);
    }
  };

  const handleGenerateDescription = async () => {
    const currentProductName = watch('name');
    const categoryId = watch('categoryId');
    if (!currentProductName) {
      toast({ title: "Cannot Generate", description: "Please enter a product name first.", variant: "destructive" });
      return;
    }
    const categoryName = categories.find(c => c.id === categoryId)?.name || 'General';

    setIsGeneratingDescription(true);
    try {
      const result = await generateProductDescription({ productName: currentProductName, categoryName });
      if (result.generatedDescription) {
        setValue('description', result.generatedDescription, { shouldValidate: true });
        toast({ title: "Description Generated!", description: "The product description has been filled in by AI." });
      } else {
        toast({ title: "AI Generation Failed", description: "Could not generate a description. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error generating product description:", error);
      toast({ title: "Error", description: "An unexpected error occurred while generating the description.", variant: "destructive" });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
            <ImagePlus className="mr-3 h-7 w-7 text-primary"/>
            {initialData ? 'Edit Product & Images' : 'Create New Product'}
        </CardTitle>
        <CardDescription>
          Manage product details and images. Images are stored in {dataSourceType === 'local' ? 'your browser via IndexedDB' : 'Firebase Storage'}.
          You can upload one primary image and up to {MAX_TOTAL_IMAGES - 1} additional images. Max {MAX_FILE_SIZE_MB}MB per image.
        </CardDescription>
         <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Storage Warning:</strong> Using {dataSourceType === 'local' ? 'Browser IndexedDB has storage limits and can be cleared by the user. ' : 'Firebase Storage may incur costs. '}
            Always use optimized web images.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Premium T-Shirt" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDescription || !productName}>
                {isGeneratingDescription ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                Generate
              </Button>
            </div>
            <Textarea id="description" {...register('description')} placeholder="Detailed description..." rows={5} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2 border p-4 rounded-md bg-muted/30">
            <Label htmlFor="primaryImageFile" className="font-medium">Primary Image</Label>
            <Input id="primaryImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                   onChange={(e) => handleFileChange(e, 'primary')}
                   className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            {(primaryImage.previewUrl || primaryImage.id) && (
              <div className="mt-2 relative w-32 h-32">
                 <ProductImage imageId={primaryImage.previewUrl || primaryImage.id} alt="Primary preview" className="w-full h-full rounded-md border" imageClassName="object-cover" />
                 <Button type="button" variant="destructive" size="icon" onClick={() => removeImage('primary')} className="absolute -top-2 -right-2 h-6 w-6 p-1">
                  <Trash2 className="h-3 w-3"/>
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4 border p-4 rounded-md bg-muted/30">
            <Label className="font-medium">Additional Images (up to {MAX_TOTAL_IMAGES - 1})</Label>
            {additionalImages.map((imgState, index) => (
              <div key={`additional-${imgState.id || index}`} className="space-y-2 border-t pt-3 mt-3 first:border-t-0 first:mt-0 first:pt-0">
                <Label htmlFor={`additionalImageFile-${index}`}>Additional Image {index + 1}</Label>
                <div className="flex items-center gap-2">
                  <Input id={`additionalImageFile-${index}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                         onChange={(e) => handleFileChange(e, 'additional', index)}
                         className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 flex-grow"/>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeImage('additional', index)} aria-label={`Remove additional image slot ${index + 1}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {(imgState.previewUrl || imgState.id) && (
                  <div className="mt-1 relative w-24 h-24">
                     <ProductImage imageId={imgState.previewUrl || imgState.id} alt={`Additional preview ${index + 1}`} className="w-full h-full rounded-md border" imageClassName="object-cover" />
                  </div>
                )}
              </div>
            ))}
            {((primaryImage.id || primaryImage.file ? 1 : 0) + additionalImages.length) < MAX_TOTAL_IMAGES && (
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalImageSlot}>
                <UploadCloud className="mr-2 h-4 w-4" /> Add Image Slot
              </Button>
            )}
          </div>


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
                name="categoryId" control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={initialData?.categoryId}>
                        <SelectTrigger id="categoryId"><SelectValue placeholder="Select a category" /></SelectTrigger>
                        <SelectContent>
                        {categories.length > 0 ? categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))
                         : <SelectItem value="no-cat" disabled>No categories. Create one first.</SelectItem>}
                        </SelectContent>
                    </Select>
                )} />
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
            {categories.length === 0 && <p className="text-xs text-muted-foreground">No categories. <Link href="/admin/categories/new" className="underline">Create one</Link>.</p>}
          </div>

          <Button type="button" variant="outline" onClick={handleSuggestCategories} disabled={isSuggestingCategories || !productDescription}>
            {isSuggestingCategories ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
            Suggest Categories (AI)
          </Button>
          {suggestedCategories.length > 0 && (
            <div className="space-y-2 p-3 bg-accent/20 rounded-md">
              <p className="text-sm font-medium">AI Suggested:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedCategories.map((cat, idx) => (
                  <Badge key={idx} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                        const existing = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
                        if (existing) {setValue('categoryId', existing.id, {shouldValidate: true }); toast({title: "Category Selected"});}
                        else {toast({title: "New Category Suggested", description: `"${cat}" - you may need to create it.`});}
                    }}>{cat}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || categories.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            {initialData ? 'Save Changes' : 'Create Product'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
