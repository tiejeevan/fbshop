
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Job, JobCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Briefcase, DollarSign, Flame, ShieldCheck, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';


const jobFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000, 'Description cannot exceed 1000 characters'),
  categoryId: z.string().min(1, 'Please select a category'),
  compensationAmount: z.coerce.number().min(0, "Compensation must be 0 or more").optional(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').optional(),
  status: z.enum(['open', 'accepted', 'completed', 'expired']),
  isUrgent: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  initialData?: Job | null;
  allCategories: JobCategory[];
  onFormSubmit: (data: JobFormValues) => Promise<void>;
  isSubmitting: boolean;
  isEditing: boolean;
}

export function JobForm({ initialData, allCategories, onFormSubmit, isSubmitting, isEditing }: JobFormProps) {
  const router = useRouter();

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      categoryId: initialData?.categoryId || '',
      compensationAmount: initialData?.compensationAmount || 0,
      location: initialData?.location || '',
      status: initialData?.status || 'open',
      isUrgent: initialData?.isUrgent || false,
      isVerified: initialData?.isVerified || false,
    }
  });

  useEffect(() => {
    if (initialData) {
        setValue('title', initialData.title);
        setValue('description', initialData.description);
        setValue('categoryId', initialData.categoryId || '');
        setValue('compensationAmount', initialData.compensationAmount || 0);
        setValue('location', initialData.location || '');
        setValue('status', initialData.status);
        setValue('isUrgent', initialData.isUrgent || false);
        setValue('isVerified', initialData.isVerified || false);
    }
  }, [initialData, setValue]);

  return (
    <Card className="max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle className="font-headline text-3xl flex items-center gap-3"><Briefcase /> {isEditing ? 'Edit Job' : 'Create New Job'}</CardTitle>
            <CardDescription>{isEditing ? `Editing job: "${initialData?.title}"` : 'Create a new job posting as an administrator.'}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onFormSubmit)}>
            <CardContent className="space-y-6">
                <div className="space-y-1.5">
                    <Label htmlFor="title">Job Title</Label>
                    <Input id="title" {...register('title')} placeholder="e.g., 'Help moving a couch'" />
                    {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...register('description')} placeholder="Provide details about the job..." rows={6}/>
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="categoryId">Category</Label>
                        <Controller name="categoryId" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                                <SelectTrigger id="categoryId"><SelectValue placeholder="Select a job category" /></SelectTrigger>
                                <SelectContent>
                                    {allCategories.length > 0 ? (
                                        allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                    ) : (
                                        <SelectItem value="" disabled>No categories available</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        )}/>
                        {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="status">Status</Label>
                        <Controller name="status" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="accepted">Accepted</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                            </Select>
                        )}/>
                        {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="compensationAmount" className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground"/>Compensation ($)</Label>
                        <Input id="compensationAmount" {...register('compensationAmount')} type="number" step="0.01" min="0" placeholder="e.g. 25.00" />
                        {errors.compensationAmount && <p className="text-sm text-destructive">{errors.compensationAmount.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>Location (Optional)</Label>
                        <Input id="location" {...register('location')} placeholder="e.g., Downtown" />
                        {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        <Controller name="isUrgent" control={control} render={({ field }) => ( <Switch id="isUrgent" checked={field.value} onCheckedChange={field.onChange}/> )}/>
                        <Label htmlFor="isUrgent" className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-orange-500"/>Mark as Urgent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Controller name="isVerified" control={control} render={({ field }) => ( <Switch id="isVerified" checked={field.value} onCheckedChange={field.onChange}/> )}/>
                        <Label htmlFor="isVerified" className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-blue-500"/>Mark as Verified</Label>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/jobs')}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || allCategories.length === 0}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Save Changes' : 'Create Job'}
                </Button>
            </CardFooter>
        </form>
    </Card>
  );
}
