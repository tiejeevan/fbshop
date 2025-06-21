
'use client';

import React, { useEffect, useState, ChangeEvent } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { JobCategory } from '@/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const jobCategorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters' }),
  slug: z.string().min(2, { message: 'Slug must be at least 2 characters' }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens.' }),
  description: z.string().optional(),
});

export type JobCategoryFormValues = z.infer<typeof jobCategorySchema>;

interface JobCategoryFormProps {
  initialData?: JobCategory | null;
  onFormSubmit: (data: JobCategoryFormValues, id?: string) => Promise<void>;
}

export function JobCategoryForm({ initialData, onFormSubmit }: JobCategoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobCategoryFormValues>({
    resolver: zodResolver(jobCategorySchema),
    defaultValues: {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
    }
  });

  const categoryName = watch('name');

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name || '');
      setValue('slug', initialData.slug || '');
      setValue('description', initialData.description || '');
    }
  }, [initialData, setValue]);

  useEffect(() => {
    const currentSlug = watch('slug');
    if (categoryName && (!currentSlug || currentSlug === categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''))) {
      setValue('slug', categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
    }
  }, [categoryName, watch, setValue]);

  const onSubmitHandler: SubmitHandler<JobCategoryFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      await onFormSubmit(data, initialData?.id);
    } catch (error) {
      // Error is handled by parent onFormSubmit
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{initialData?.id ? 'Edit Job Category' : 'Create New Job Category'}</CardTitle>
        <CardDescription>{initialData?.id ? 'Update details.' : 'Add a new category for jobs.'}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmitHandler)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Manual Labor" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register('slug')} placeholder="e.g. manual-labor" />
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Brief description..." rows={3} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/job-categories')}>
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
