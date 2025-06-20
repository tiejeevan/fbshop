
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
import Link from 'next/link';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getImage as getImageFromDB } from '@/lib/indexedDbService';
import { ProductImage } from '@/components/product/ProductImage';

const MAX_TOTAL_IMAGES = 10;
const MAX_FILE_SIZE_MB = 0.5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const productSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  primaryImageId: z.string().optional().nullable(),
  additionalImageIds: z.array(z.string()).max(MAX_TOTAL_IMAGES - 1).optional(),
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
  id: string | null;
}

export function ProductForm({ initialData, categories, onFormSubmit }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);

  const [primaryImageFile, setPrimaryImageFile] = useState<ImageFileState>({
    file: null,
    previewUrl: null,
    id: initialData?.primaryImageId || null
  });
  const [additionalImageFiles, setAdditionalImageFiles] = useState<ImageFileState[]>(
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
          primaryImageId: initialData.primaryImageId || null,
          additionalImageIds: initialData.additionalImageIds || [],
        }
      : {
          name: '',
          description: '',
          primaryImageId: null,
          additionalImageIds: [],
          price: 0,
          stock: 0,
          categoryId: '',
        },
  });
  
  useEffect(() => {
    let primaryObjectUrl: string | null = null;
    const additionalObjectUrls: (string | null)[] = additionalImageFiles.map(() => null);

    const loadPreviews = async () => {
        if (initialData?.primaryImageId && !primaryImageFile.file) {
            const blob = await getImageFromDB(initialData.primaryImageId);
            if (blob) {
                primaryObjectUrl = URL.createObjectURL(blob);
                setPrimaryImageFile(prev => ({ ...prev, id: initialData.primaryImageId, previewUrl: primaryObjectUrl }));
            }
        }
        const newAdditionalPreviews = await Promise.all(
            (initialData?.additionalImageIds || []).map(async (id, index) => {
                if (id && !additionalImageFiles[index]?.file) {
                    const blob = await getImageFromDB(id);
                    if (blob) {
                        additionalObjectUrls[index] = URL.createObjectURL(blob);
                        return { file: null, previewUrl: additionalObjectUrls[index], id };
                    }
                }
                return additionalImageFiles[index] || { file: null, previewUrl: null, id };
            })
        );
        setAdditionalImageFiles(newAdditionalPreviews);
    };

    loadPreviews();

    return () => {
        if (primaryObjectUrl) URL.revokeObjectURL(primaryObjectUrl);
        additionalObjectUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.primaryImageId, initialData?.additionalImageIds]);

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('description', initialData.description);
      setValue('price', initialData.price);
      setValue('stock', initialData.stock);
      setValue('categoryId', initialData.categoryId);
      setValue('primaryImageId', initialData.primaryImageId || null);
      setValue('additionalImageIds', initialData.additionalImageIds || []);
    }
  }, [initialData, setValue]);


  const productDescription = watch('description');

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    imageType: 'primary' | 'additional',
    index?: number
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File Too Large", description: `Image size should not exceed ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      event.target.value = ''; return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select JPG, PNG, WEBP, or GIF.", variant: "destructive" });
        event.target.value = ''; return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (imageType === 'primary') {
      if (primaryImageFile.previewUrl && primaryImageFile.previewUrl.startsWith('blob:')) URL.revokeObjectURL(primaryImageFile.previewUrl);
      setPrimaryImageFile(prev => ({ ...prev, file, previewUrl }));
    } else if (index !== undefined) {
      setAdditionalImageFiles(prev => {
        const newFiles = [...prev];
        if (newFiles[index]?.previewUrl && newFiles[index].previewUrl!.startsWith('blob:')) URL.revokeObjectURL(newFiles[index].previewUrl!);
        newFiles[index] = { ...newFiles[index], file, previewUrl };
        return newFiles;
      });
    }
    event.target.value = '';
  };

  const addAdditionalImageSlot = () => {
    if (additionalImageFiles.length < MAX_TOTAL_IMAGES - 1) {
      setAdditionalImageFiles(prev => [...prev, { file: null, previewUrl: null, id: null }]);
    } else {
      toast({ title: "Image Limit Reached", description: `Max ${MAX_TOTAL_IMAGES - 1} additional images.`, variant: "destructive"});
    }
  };

  const removePrimaryImage = () => {
    if (primaryImageFile.previewUrl && primaryImageFile.previewUrl.startsWith('blob:')) URL.revokeObjectURL(primaryImageFile.previewUrl);
    setPrimaryImageFile(prev => ({ ...prev, file: null, previewUrl: null }));
    const fileInput = document.getElementById('primaryImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImageFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index]?.previewUrl && newFiles[index].previewUrl!.startsWith('blob:')) URL.revokeObjectURL(newFiles[index].previewUrl!);
      newFiles[index] = { ...newFiles[index], file: null, previewUrl: null };
      return newFiles;
    });
    const fileInput = document.getElementById(`additionalImageFile-${index}`) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const removeAdditionalImageSlot = (index: number) => {
    const imageState = additionalImageFiles[index];
    if (imageState?.previewUrl && imageState.previewUrl.startsWith('blob:')) URL.revokeObjectURL(imageState.previewUrl);
    setAdditionalImageFiles(prev => prev.filter((_, i) => i !== index));
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

  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    setIsSubmitting(true);

    const imagesToSave: {type: 'primary' | 'additional', index?: number, file: File}[] = [];
    const imageIdsMarkedForDeletionByUI: string[] = [];

    if (primaryImageFile.file) {
      imagesToSave.push({ type: 'primary', file: primaryImageFile.file });
    } else if (!primaryImageFile.previewUrl && primaryImageFile.id) {
      imageIdsMarkedForDeletionByUI.push(primaryImageFile.id);
    }

    additionalImageFiles.forEach((imgState, index) => {
      if (imgState.file) {
        imagesToSave.push({ type: 'additional', index, file: imgState.file });
      } else if (!imgState.previewUrl && imgState.id) {
        imageIdsMarkedForDeletionByUI.push(imgState.id);
      }
    });
    
    setValue('primaryImageId', primaryImageFile.id); 
    setValue('additionalImageIds', additionalImageFiles.map(f => f.id).filter(id => id !== null) as string[]);


    try {
      await onFormSubmit(data, initialData?.id, imagesToSave, imageIdsMarkedForDeletionByUI);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
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
          Manage product details and images. Images are stored in your browser via IndexedDB.
          You can upload one primary image and up to {MAX_TOTAL_IMAGES - 1} additional images. Max {MAX_FILE_SIZE_MB}MB per image.
        </CardDescription>
         <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Browser Storage Warning:</strong> While IndexedDB offers more space than LocalStorage, it's still finite and browser-dependent.
            Large or numerous images can impact performance and eventually hit browser quotas. Use optimized web images.
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
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Detailed description..." rows={5} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2 border p-4 rounded-md bg-muted/30">
            <Label htmlFor="primaryImageFile" className="font-medium">Primary Image</Label>
            <Input id="primaryImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                   onChange={(e) => handleFileChange(e, 'primary')}
                   className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            {primaryImageFile.previewUrl ? (
              <div className="mt-2 relative w-32 h-32">
                <Image src={primaryImageFile.previewUrl} alt="Primary preview" layout="fill" objectFit="cover" className="rounded-md border" data-ai-hint="product primary preview" unoptimized/>
                <Button type="button" variant="destructive" size="icon" onClick={removePrimaryImage} className="absolute -top-2 -right-2 h-6 w-6 p-1">
                  <Trash2 className="h-3 w-3"/>
                </Button>
              </div>
            ) : primaryImageFile.id ? (
                <div className="mt-2 relative w-32 h-32">
                    <ProductImage imageId={primaryImageFile.id} alt="Current primary image" className="w-full h-full rounded-md border" imageClassName="object-cover" />
                    <Button type="button" variant="destructive" size="icon" onClick={removePrimaryImage} className="absolute -top-2 -right-2 h-6 w-6 p-1">
                        <Trash2 className="h-3 w-3"/>
                    </Button>
                </div>
            ): null}
            {errors.primaryImageId && <p className="text-sm text-destructive">{errors.primaryImageId.message}</p>}
          </div>

          <div className="space-y-4 border p-4 rounded-md bg-muted/30">
            <Label className="font-medium">Additional Images (up to {MAX_TOTAL_IMAGES - 1})</Label>
            {additionalImageFiles.map((imgState, index) => (
              <div key={`additional-${imgState.id || index}`} className="space-y-2 border-t pt-3 mt-3 first:border-t-0 first:mt-0 first:pt-0">
                <Label htmlFor={`additionalImageFile-${index}`}>Additional Image {index + 1}</Label>
                <div className="flex items-center gap-2">
                  <Input id={`additionalImageFile-${index}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                         onChange={(e) => handleFileChange(e, 'additional', index)}
                         className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 flex-grow"/>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAdditionalImageSlot(index)} aria-label={`Remove additional image slot ${index + 1}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {imgState.previewUrl ? (
                  <div className="mt-1 relative w-24 h-24">
                    <Image src={imgState.previewUrl} alt={`Additional preview ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md border" data-ai-hint="product additional preview" unoptimized/>
                     <Button type="button" variant="destructive" size="icon" onClick={() => removeAdditionalImage(index)} className="absolute -top-2 -right-2 h-5 w-5 p-0.5" aria-label={`Clear additional image ${index + 1}`}>
                        <Trash2 className="h-3 w-3"/>
                    </Button>
                  </div>
                ) : imgState.id ? (
                     <div className="mt-1 relative w-24 h-24">
                        <ProductImage imageId={imgState.id} alt={`Current additional image ${index + 1}`} className="w-full h-full rounded-md border" imageClassName="object-cover" />
                         <Button type="button" variant="destructive" size="icon" onClick={() => removeAdditionalImage(index)} className="absolute -top-2 -right-2 h-5 w-5 p-0.5" aria-label={`Clear additional image ${index + 1}`}>
                            <Trash2 className="h-3 w-3"/>
                        </Button>
                    </div>
                ) : null}
                 {errors.additionalImageIds && errors.additionalImageIds[index] && <p className="text-sm text-destructive">{errors.additionalImageIds[index]?.message}</p>}
              </div>
            ))}
            {additionalImageFiles.length < MAX_TOTAL_IMAGES - 1 && (
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalImageSlot}>
                <UploadCloud className="mr-2 h-4 w-4" /> Add Image Slot
              </Button>
            )}
             {errors.additionalImageIds && !Array.isArray(errors.additionalImageIds) && <p className="text-sm text-destructive">{errors.additionalImageIds.message}</p>}
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
