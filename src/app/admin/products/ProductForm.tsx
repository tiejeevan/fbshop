
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

const MAX_TOTAL_IMAGES = 10; // 1 primary + 9 additional
const MAX_FILE_SIZE_MB = 0.5; // Max 0.5 MB per image (500KB) - keeping this low for local storage
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const imageSchema = z.string().refine(value => value.startsWith('data:image/'), {
  message: "Invalid image format. Only Data URIs are allowed.",
}).optional().nullable();

const productSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  primaryImageDataUri: imageSchema,
  additionalImageDataUris: z.array(imageSchema.refine(val => val !== null, { message: "Empty additional image slot found." })).max(MAX_TOTAL_IMAGES - 1).optional(),
  price: z.coerce.number().min(0.01, { message: 'Price must be greater than 0' }),
  stock: z.coerce.number().min(0, { message: 'Stock cannot be negative' }).int(),
  categoryId: z.string().min(1, { message: 'Please select a category' }),
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
  
  const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(initialData?.primaryImageDataUri || null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<(string | null)[]>(initialData?.additionalImageDataUris || []);


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
          primaryImageDataUri: initialData.primaryImageDataUri || null,
          additionalImageDataUris: initialData.additionalImageDataUris || [],
        }
      : {
          name: '',
          description: '',
          primaryImageDataUri: null,
          additionalImageDataUris: [],
          price: 0,
          stock: 0,
          categoryId: '',
        },
  });
  
  const productDescription = watch('description');

  const { fields: additionalImageFields, append, remove, update } = useFieldArray({
    control,
    name: "additionalImageDataUris"
  });

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('description', initialData.description);
      setValue('price', initialData.price);
      setValue('stock', initialData.stock);
      setValue('categoryId', initialData.categoryId);
      setValue('primaryImageDataUri', initialData.primaryImageDataUri || null);
      setPrimaryImagePreview(initialData.primaryImageDataUri || null);
      
      const initialAdditionalUris = initialData.additionalImageDataUris || [];
      setValue('additionalImageDataUris', initialAdditionalUris.map(uri => uri || null));
      setAdditionalImagePreviews(initialAdditionalUris);
    }
  }, [initialData, setValue]);

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    isPrimary: boolean,
    index?: number
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `Image size should not exceed ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`,
        variant: "destructive",
        duration: 5000,
      });
      event.target.value = ''; // Clear the input
      return;
    }
    
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
            title: "Invalid File Type",
            description: "Please select a valid image file (JPG, PNG, WEBP, GIF).",
            variant: "destructive",
            duration: 5000,
        });
        event.target.value = ''; // Clear the input
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result as string;
      if (isPrimary) {
        setValue('primaryImageDataUri', dataUri, { shouldValidate: true });
        setPrimaryImagePreview(dataUri);
      } else if (index !== undefined) {
        const currentUris = watch('additionalImageDataUris') || [];
        currentUris[index] = dataUri;
        setValue('additionalImageDataUris', currentUris, { shouldValidate: true });
        
        const newPreviews = [...additionalImagePreviews];
        newPreviews[index] = dataUri;
        setAdditionalImagePreviews(newPreviews);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const addAdditionalImageSlot = () => {
    if (additionalImageFields.length < MAX_TOTAL_IMAGES - 1) {
      append(null); // Add a slot for a new image
      setAdditionalImagePreviews(prev => [...prev, null]);
    } else {
      toast({ title: "Image Limit Reached", description: `You can add a maximum of ${MAX_TOTAL_IMAGES -1} additional images.`, variant: "destructive"});
    }
  };

  const removePrimaryImage = () => {
    setValue('primaryImageDataUri', null, { shouldValidate: true });
    setPrimaryImagePreview(null);
    const fileInput = document.getElementById('primaryImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const removeAdditionalImage = (index: number) => {
    remove(index);
    const newPreviews = additionalImagePreviews.filter((_, i) => i !== index);
    setAdditionalImagePreviews(newPreviews);
    const fileInput = document.getElementById(`additionalImageFile-${index}`) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };


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

  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    setIsSubmitting(true);
    const processedData = {
      ...data,
      primaryImageDataUri: primaryImagePreview, // Ensure preview state is source of truth
      additionalImageDataUris: additionalImagePreviews.filter(uri => uri !== null) as string[],
    };
    try {
      await onFormSubmit(processedData, initialData?.id);
    } catch (error) {
       // Error is handled by onFormSubmit and toast is shown there
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
          {initialData ? 'Update product details and manage images.' : 'Fill in the form to add a new product.'}
          You can upload one primary image and up to {MAX_TOTAL_IMAGES - 1} additional images.
        </CardDescription>
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Local Storage Warning:</strong> Images are stored directly in your browser's local storage, which has limited space (typically 5-10MB total for this website). 
            Please use small image files (ideally under {MAX_FILE_SIZE_MB}MB each) to avoid exceeding limits and performance issues.
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
            <Textarea id="description" {...register('description')} placeholder="Detailed description of the product..." rows={5} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          
          <div className="space-y-2 border p-4 rounded-md bg-muted/30">
            <Label htmlFor="primaryImageFile" className="font-medium">Primary Image</Label>
            <Input 
              id="primaryImageFile" 
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/gif" 
              onChange={(e) => handleFileChange(e, true)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {primaryImagePreview && (
              <div className="mt-2 relative w-32 h-32">
                <Image src={primaryImagePreview} alt="Primary preview" layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="product image preview"/>
                <Button type="button" variant="destructive" size="icon" onClick={removePrimaryImage} className="absolute -top-2 -right-2 h-6 w-6 p-1" aria-label="Remove primary image">
                  <Trash2 className="h-3 w-3"/>
                </Button>
              </div>
            )}
            {errors.primaryImageDataUri && <p className="text-sm text-destructive">{errors.primaryImageDataUri.message}</p>}
          </div>

          <div className="space-y-4 border p-4 rounded-md bg-muted/30">
            <Label className="font-medium">Additional Images (up to {MAX_TOTAL_IMAGES - 1})</Label>
            {additionalImageFields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`additionalImageFile-${index}`}>Additional Image {index + 1}</Label>
                 <div className="flex items-center gap-2">
                    <Input 
                        id={`additionalImageFile-${index}`} 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleFileChange(e, false, index)}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 flex-grow"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAdditionalImage(index)} aria-label={`Remove additional image ${index + 1}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                {additionalImagePreviews[index] && (
                  <div className="mt-1 relative w-24 h-24">
                    <Image src={additionalImagePreviews[index]!} alt={`Additional preview ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="product image preview"/>
                  </div>
                )}
                {errors.additionalImageDataUris?.[index]?.message && <p className="text-sm text-destructive">{errors.additionalImageDataUris[index]?.message}</p>}
              </div>
            ))}
            {additionalImageFields.length < MAX_TOTAL_IMAGES - 1 && (
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalImageSlot}>
                <UploadCloud className="mr-2 h-4 w-4" /> Add Image Slot
              </Button>
            )}
            {errors.additionalImageDataUris && !Array.isArray(errors.additionalImageDataUris) && errors.additionalImageDataUris.message && (
                 <p className="text-sm text-destructive">{errors.additionalImageDataUris.message}</p>
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
          
          <Button type="button" variant="outline" onClick={handleSuggestCategories} disabled={isSuggestingCategories || !productDescription}>
            {isSuggestingCategories ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Suggest Categories with AI (uses description)
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
