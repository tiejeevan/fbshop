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
import { Loader2, ImagePlus, UploadCloud, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductImage } from '@/components/product/ProductImage';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_FILE_SIZE_MB = 0.5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const NO_PARENT_VALUE = "___NO_PARENT___";

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters' }),
  slug: z.string().min(2, { message: 'Slug must be at least 2 characters' }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens.' }),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  displayOrder: z.coerce.number().int().min(0, { message: 'Display order must be a non-negative integer' }),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: Partial<Category> | null;
  onFormSubmit: (data: CategoryFormValues, imageFile: File | null, id?: string) => Promise<void>;
  allCategories: Category[];
}

interface ImageFileState {
  file: File | null;
  previewUrl: string | null;
  id: string | null;
}

export function CategoryForm({ initialData, onFormSubmit, allCategories }: CategoryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { dataSourceType } = useDataSource();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageState, setImageState] = useState<ImageFileState>({ file: null, previewUrl: null, id: initialData?.imageId || null });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        description: initialData?.description || '',
        parentId: initialData?.parentId || null,
        displayOrder: initialData?.displayOrder === undefined ? 0 : initialData.displayOrder,
        isActive: initialData?.isActive === undefined ? true : initialData.isActive,
      }
  });

  const categoryName = watch('name');

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name || '');
      setValue('slug', initialData.slug || '');
      setValue('description', initialData.description || '');
      setValue('parentId', initialData.parentId || null);
      setValue('displayOrder', initialData.displayOrder === undefined ? 0 : initialData.displayOrder);
      setValue('isActive', initialData.isActive === undefined ? true : initialData.isActive);
      setImageState({ file: null, previewUrl: null, id: initialData.imageId || null });
    }
  }, [initialData, setValue]);

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
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select JPG, PNG, WEBP or GIF.", variant: "destructive" });
        return;
      }
      event.target.value = '';

      if (imageState.previewUrl) URL.revokeObjectURL(imageState.previewUrl);
      setImageState({ ...imageState, file, previewUrl: URL.createObjectURL(file) });
    }
  };

  const removeImage = () => {
    if (imageState.previewUrl) URL.revokeObjectURL(imageState.previewUrl);
    setImageState({ file: null, previewUrl: null, id: null });
  };

  const onSubmitHandler: SubmitHandler<CategoryFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const finalData = { ...data, imageId: imageState.id };
      await onFormSubmit(finalData, imageState.file, initialData?.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPossibleParents = (categories: Category[], currentId?: string): Category[] => {
    if (!currentId) return categories.filter(cat => cat.isActive);
    
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
        <CardTitle className="font-headline text-2xl">{initialData?.id ? 'Edit Category' : 'Create New Category'}</CardTitle>
        <CardDescription>{initialData?.id ? 'Update details.' : 'Add a new category.'}</CardDescription>
        <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
                <strong>Storage Warning:</strong> Using {dataSourceType === 'local' ? 'Browser IndexedDB has storage limits. ' : 'Firebase Storage may incur costs. '}
                Use optimized web images.
            </AlertDescription>
        </Alert>
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
                <Select
                  onValueChange={(value) => field.onChange(value === NO_PARENT_VALUE ? null : value)}
                  value={field.value === null || field.value === undefined ? NO_PARENT_VALUE : field.value}
                >
                  <SelectTrigger id="parentId">
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_VALUE}>None (Top-level)</SelectItem>
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
            
            {(imageState.previewUrl || imageState.id) && (
              <div className="mt-2 relative w-32 h-32">
                 <ProductImage imageId={imageState.previewUrl || imageState.id} alt="Category preview" className="w-full h-full rounded-md border" imageClassName="object-cover" />
                 <Button type="button" variant="destructive" size="icon" onClick={removeImage} className="absolute -top-2 -right-2 h-6 w-6 p-1">
                  <Trash2 className="h-3 w-3"/>
                </Button>
              </div>
            )}
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
            {initialData?.id ? 'Save Changes' : 'Create Category'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
