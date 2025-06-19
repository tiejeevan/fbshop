
'use client';

import React, { useEffect, useState, ChangeEvent } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { Loader2, ImagePlus, UploadCloud, Trash2 } from 'lucide-react';
import { localStorageService } from '@/lib/localStorage';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image'; // For image preview
import { ProductImage } from '@/components/product/ProductImage'; // For displaying existing images from DB

const MAX_FILE_SIZE_MB = 0.5; // Max 0.5 MB per image
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters' }),
  slug: z.string().min(2, { message: 'Slug must be at least 2 characters' }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens.' }),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  imageId: z.string().nullable().optional(),
  displayOrder: z.coerce.number().int().min(0, { message: 'Display order must be a non-negative integer' }),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: Category | null;
  onFormSubmit: (data: CategoryFormValues, imageFile: File | null, id?: string) => Promise<void>;
  allCategories: Category[]; // Pass all categories for parent selection
}

interface ImageFileState {
  file: File | null;
  previewUrl: string | null;
}

export function CategoryForm({ initialData, onFormSubmit, allCategories }: CategoryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageState, setImageState] = useState<ImageFileState>({ file: null, previewUrl: null });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control, // For Select and Switch
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData
      ? {
          ...initialData,
          parentId: initialData.parentId || null, // Ensure null if undefined
          imageId: initialData.imageId || null,
          slug: initialData.slug || '',
          displayOrder: initialData.displayOrder || 0,
          isActive: initialData.isActive === undefined ? true : initialData.isActive,
        }
      : {
          name: '',
          slug: '',
          description: '',
          parentId: null,
          imageId: null,
          displayOrder: (localStorageService.getCategories().length > 0 ? Math.max(...localStorageService.getCategories().map(c => c.displayOrder)) : 0) + 1,
          isActive: true,
        },
  });

  const categoryName = watch('name');
  const currentImageId = watch('imageId'); // Watch existing imageId from form data

  useEffect(() => {
    if (initialData) {
      Object.keys(initialData).forEach(key => {
        const typedKey = key as keyof CategoryFormValues;
        if (typedKey === 'parentId' && initialData[typedKey] === undefined) {
            setValue(typedKey, null as any);
        } else if (typedKey === 'imageId' && initialData[typedKey] === undefined) {
             setValue(typedKey, null as any);
        } else if (typedKey === 'isActive' && initialData[typedKey] === undefined) {
            setValue(typedKey, true as any);
        } else if (typedKey === 'displayOrder' && initialData[typedKey] === undefined) {
            setValue(typedKey, 0 as any);
        }
        else {
            setValue(typedKey, initialData[key as keyof Category] as any);
        }
      });
       // Set initial image preview if editing and imageId exists
      if (initialData.imageId) {
        // This assumes ProductImage hook or direct IndexedDB access might be needed
        // For simplicity now, let's assume ProductImage handles preview from ID.
        // Or, if we were storing Blobs directly in Category, we could create an ObjectURL.
        // For now, relying on ProductImage component to show existing.
      }
    }
  }, [initialData, setValue]);

  // Auto-generate slug from name, if slug is empty or if name changes and slug was auto-generated
  useEffect(() => {
    const currentSlug = watch('slug');
    if (categoryName && (!currentSlug || currentSlug === categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''))) {
      setValue('slug', categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
    }
  }, [categoryName, watch, setValue]);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Image size should not exceed ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        event.target.value = ''; return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select JPG, PNG, WEBP or GIF.", variant: "destructive" });
        event.target.value = ''; return;
      }

      if (imageState.previewUrl && imageState.previewUrl.startsWith('blob:')) URL.revokeObjectURL(imageState.previewUrl);
      setImageState({ file, previewUrl: URL.createObjectURL(file) });
      setValue('imageId', 'new_image_placeholder'); // Temporary value to satisfy form validation if imageId is required
    }
    event.target.value = '';
  };

  const removeImage = () => {
    if (imageState.previewUrl && imageState.previewUrl.startsWith('blob:')) URL.revokeObjectURL(imageState.previewUrl);
    setImageState({ file: null, previewUrl: null });
    setValue('imageId', null); // Signal that existing image (if any) should be removed or no new image
    const fileInput = document.getElementById('categoryImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };


  const onSubmitHandler: SubmitHandler<CategoryFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      // The actual imageId for new uploads will be generated by the parent onFormSubmit
      // Here, data.imageId might be the old one, null, or 'new_image_placeholder'
      // The parent function will decide if it needs to save imageState.file
      await onFormSubmit(data, imageState.file, initialData?.id);
    } catch (error) {
      // Error is handled by parent onFormSubmit and toast is shown there
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPossibleParents = (categories: Category[], currentId?: string): Category[] => {
    if (!currentId) return categories.filter(cat => cat.isActive); // For new category, all active are possible
    
    const descendantIds: string[] = [];
    const findDescendants = (parentId: string) => {
      categories.forEach(cat => {
        if (cat.parentId === parentId) {
          descendantIds.push(cat.id);
          findDescendants(cat.id);
        }
      });
    };
    findDescendants(currentId);
    
    return categories.filter(cat => cat.isActive && cat.id !== currentId && !descendantIds.includes(cat.id));
  };
  const possibleParentCategories = getPossibleParents(allCategories, initialData?.id);


  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{initialData ? 'Edit Category' : 'Create New Category'}</CardTitle>
        <CardDescription>{initialData ? 'Update details.' : 'Add a new category.'}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmitHandler)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Electronics" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register('slug')} placeholder="e.g. electronics" />
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Brief description..." rows={3} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category</Label>
            <Controller
              name="parentId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={(value) => field.onChange(value === '' ? null : value)} value={field.value || ''}>
                  <SelectTrigger id="parentId">
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Top-level)</SelectItem>
                    {possibleParentCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.parentId && <p className="text-sm text-destructive">{errors.parentId.message}</p>}
          </div>

          <div className="space-y-2 border p-4 rounded-md bg-muted/30">
            <Label htmlFor="categoryImageFile" className="font-medium flex items-center gap-2"><ImagePlus/>Category Image (Optional)</Label>
            <Input id="categoryImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                   onChange={handleImageFileChange}
                   className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            <p className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_MB}MB. JPG, PNG, WEBP, GIF.</p>
            
            {imageState.previewUrl && (
              <div className="mt-2 relative w-32 h-32">
                <Image src={imageState.previewUrl} alt="New category preview" layout="fill" objectFit="cover" className="rounded-md border" data-ai-hint="category preview" unoptimized/>
                <Button type="button" variant="destructive" size="icon" onClick={removeImage} className="absolute -top-2 -right-2 h-6 w-6 p-1">
                  <Trash2 className="h-3 w-3"/>
                </Button>
              </div>
            )}
            {!imageState.previewUrl && currentImageId && ( // Show existing image if no new preview and imageId is present
                 <div className="mt-2 relative w-32 h-32">
                    <ProductImage imageId={currentImageId} alt={initialData?.name || "Category Image"} className="w-32 h-32 rounded-md border" data-ai-hint="category current"/>
                    <Button type="button" variant="destructive" size="icon" onClick={removeImage} className="absolute -top-2 -right-2 h-6 w-6 p-1">
                        <Trash2 className="h-3 w-3"/>
                    </Button>
                 </div>
            )}
            {errors.imageId && <p className="text-sm text-destructive">{errors.imageId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input id="displayOrder" type="number" {...register('displayOrder')} placeholder="0" />
            {errors.displayOrder && <p className="text-sm text-destructive">{errors.displayOrder.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isActive">Active (Visible to customers)</Label>
            {errors.isActive && <p className="text-sm text-destructive">{errors.isActive.message}</p>}
          </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/categories')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initialData ? 'Save Changes' : 'Create Category'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
