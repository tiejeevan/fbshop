
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Loader2, FlaskConical, Briefcase, ShoppingBag, Tags } from 'lucide-react';
import type { Category, JobCategory } from '@/types';
import { add } from 'date-fns';
import {
  generateMockJobs,
  generateMockProducts,
  generateMockCategories,
} from '@/ai/flows/generate-mock-data';

const generateJobsSchema = z.object({
  count: z.coerce.number().int().min(1, "At least 1 job").max(20, "Max 20 jobs"),
});
type GenerateJobsValues = z.infer<typeof generateJobsSchema>;

const generateProductsSchema = z.object({
  count: z.coerce.number().int().min(1, "At least 1 product").max(20, "Max 20 products"),
  categoryId: z.string().min(1, "Please select a category"),
});
type GenerateProductsValues = z.infer<typeof generateProductsSchema>;

const generateCategoriesSchema = z.object({
  count: z.coerce.number().int().min(1, "At least 1 category").max(10, "Max 10 categories"),
});
type GenerateCategoriesValues = z.infer<typeof generateCategoriesSchema>;

export default function MockDataGeneratorPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const [isLoading, setIsLoading] = useState({ jobs: false, products: false, categories: false });
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  
  const jobsForm = useForm<GenerateJobsValues>({ resolver: zodResolver(generateJobsSchema) });
  const productsForm = useForm<GenerateProductsValues>({ resolver: zodResolver(generateProductsSchema) });
  const categoriesForm = useForm<GenerateCategoriesValues>({ resolver: zodResolver(generateCategoriesSchema) });

  const fetchCategories = useCallback(async () => {
    if (!dataService) return;
    try {
      const [pCats, jCats] = await Promise.all([
        dataService.getCategories(),
        dataService.getJobCategories()
      ]);
      setProductCategories(pCats);
      setJobCategories(jCats);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch categories.", variant: "destructive" });
    }
  }, [dataService, toast]);

  useEffect(() => {
    if (!isDataSourceLoading) fetchCategories();
  }, [isDataSourceLoading, fetchCategories]);

  const onJobsSubmit: SubmitHandler<GenerateJobsValues> = async (data) => {
    if (!currentUser || !dataService || jobCategories.length === 0) {
      toast({ title: "Prerequisites Missing", description: "Admin user, data service, or job categories not found.", variant: "destructive"});
      return;
    }
    setIsLoading(prev => ({ ...prev, jobs: true }));
    try {
      const result = await generateMockJobs({ count: data.count });
      if (!result || !result.jobs || result.jobs.length === 0) {
        toast({ title: "AI Generation Failed", description: "The AI did not return any jobs.", variant: "destructive"});
        return;
      }
      
      for (const job of result.jobs) {
        const expiresAt = add(new Date(), { days: Math.floor(Math.random() * 7) + 1 });
        const randomCategoryId = jobCategories[Math.floor(Math.random() * jobCategories.length)].id;
        await dataService.addJob({
          title: job.title,
          description: job.description,
          compensationAmount: job.compensationAmount,
          location: job.location,
          createdById: currentUser.id,
          expiresAt: expiresAt.toISOString(),
          categoryId: randomCategoryId,
        });
      }
      toast({ title: "Success", description: `${result.jobs.length} mock jobs generated and added.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error Generating Jobs", variant: "destructive" });
    } finally {
      setIsLoading(prev => ({ ...prev, jobs: false }));
    }
  };
  
  const onProductsSubmit: SubmitHandler<GenerateProductsValues> = async (data) => {
    if (!currentUser || !dataService) return;
    setIsLoading(prev => ({ ...prev, products: true }));
    try {
      const categoryName = productCategories.find(c => c.id === data.categoryId)?.name || 'General';
      const result = await generateMockProducts({ count: data.count, categoryName });
      
      if (!result || !result.products || result.products.length === 0) {
        toast({ title: "AI Generation Failed", description: "The AI did not return any products.", variant: "destructive"});
        return;
      }
      
      for (const product of result.products) {
        await dataService.addProduct({
          ...product,
          categoryId: data.categoryId,
        });
      }
      toast({ title: "Success", description: `${result.products.length} mock products generated and added.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error Generating Products", variant: "destructive" });
    } finally {
      setIsLoading(prev => ({ ...prev, products: false }));
    }
  };

  const onCategoriesSubmit: SubmitHandler<GenerateCategoriesValues> = async (data) => {
    if (!currentUser || !dataService) return;
    setIsLoading(prev => ({ ...prev, categories: true }));
    try {
      const result = await generateMockCategories({ count: data.count });

      if (!result || !result.categories || result.categories.length === 0) {
        toast({ title: "AI Generation Failed", description: "The AI did not return any categories.", variant: "destructive"});
        return;
      }
      
      for (const category of result.categories) {
        const slug = category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        await dataService.addCategory({
          name: category.name,
          description: category.description,
          slug: slug,
          parentId: null,
          imageId: null,
          displayOrder: 99,
          isActive: true
        });
      }
      toast({ title: "Success", description: `${result.categories.length} mock categories generated and added.` });
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast({ title: "Error Generating Categories", variant: "destructive" });
    } finally {
      setIsLoading(prev => ({ ...prev, categories: false }));
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl text-primary flex items-center gap-3">
          <FlaskConical /> AI Mock Data Generator
        </h1>
        <p className="text-muted-foreground mt-1">Use AI to populate your store with sample data for testing.</p>
      </header>

      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase />Generate Jobs</CardTitle>
            <CardDescription>Create random job postings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={jobsForm.handleSubmit(onJobsSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="job-count">Number of Jobs (1-20)</Label>
                <Input id="job-count" type="number" {...jobsForm.register('count')} min="1" max="20" defaultValue="5" />
                {jobsForm.formState.errors.count && <p className="text-sm text-destructive mt-1">{jobsForm.formState.errors.count.message}</p>}
              </div>
              <Button type="submit" disabled={isLoading.jobs || jobCategories.length === 0}>
                {isLoading.jobs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
              {jobCategories.length === 0 && <p className="text-xs text-muted-foreground mt-1">Create a job category first.</p>}
            </form>
          </CardContent>
        </Card>

        {/* Products Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingBag />Generate Products</CardTitle>
            <CardDescription>Create random products within a category.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={productsForm.handleSubmit(onProductsSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="product-category">Category</Label>
                <Select onValueChange={(value) => productsForm.setValue('categoryId', value)} defaultValue="">
                  <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                  <SelectContent>
                    {productCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {productsForm.formState.errors.categoryId && <p className="text-sm text-destructive mt-1">{productsForm.formState.errors.categoryId.message}</p>}
              </div>
              <div>
                <Label htmlFor="product-count">Number of Products (1-20)</Label>
                <Input id="product-count" type="number" {...productsForm.register('count')} min="1" max="20" defaultValue="5" />
                {productsForm.formState.errors.count && <p className="text-sm text-destructive mt-1">{productsForm.formState.errors.count.message}</p>}
              </div>
              <Button type="submit" disabled={isLoading.products || productCategories.length === 0}>
                {isLoading.products && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
               {productCategories.length === 0 && <p className="text-xs text-muted-foreground mt-1">Create a product category first.</p>}
            </form>
          </CardContent>
        </Card>

        {/* Categories Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tags />Generate Categories</CardTitle>
            <CardDescription>Create new product categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={categoriesForm.handleSubmit(onCategoriesSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="category-count">Number of Categories (1-10)</Label>
                <Input id="category-count" type="number" {...categoriesForm.register('count')} min="1" max="10" defaultValue="3" />
                {categoriesForm.formState.errors.count && <p className="text-sm text-destructive mt-1">{categoriesForm.formState.errors.count.message}</p>}
              </div>
              <Button type="submit" disabled={isLoading.categories}>
                {isLoading.categories && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
