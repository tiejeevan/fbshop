
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Updated schema to include new optional fields for type compatibility
// UI for these fields will be added in subsequent enhancement steps
const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters' }),
  description: z.string().optional(),
  slug: z.string().optional(),
  parentId: z.string().nullable().optional(),
  imageId: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: Category | null;
  onFormSubmit: (data: CategoryFormValues, id?: string) => Promise<void>;
}

export function CategoryForm({ initialData, onFormSubmit }: CategoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      slug: '',
      parentId: null,
      imageId: null,
      displayOrder: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('description', initialData.description || '');
      setValue('slug', initialData.slug || '');
      setValue('parentId', initialData.parentId || null);
      setValue('imageId', initialData.imageId || null);
      setValue('displayOrder', initialData.displayOrder || 0);
      setValue('isActive', initialData.isActive === undefined ? true : initialData.isActive);
    }
  }, [initialData, setValue]);

  const onSubmit: SubmitHandler<CategoryFormValues> = async (data) => {
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
        <CardTitle className="font-headline text-2xl">{initialData ? 'Edit Category' : 'Create New Category'}</CardTitle>
        <CardDescription>{initialData ? 'Update the details of this category.' : 'Fill in the form to add a new category.'}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Electronics" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register('description')} placeholder="Brief description of the category..." rows={3} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          {/* UI for slug, parentId, imageId, displayOrder, isActive will be added in later steps */}
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
