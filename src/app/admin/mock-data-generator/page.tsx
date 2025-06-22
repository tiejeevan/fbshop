'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Loader2, FlaskConical, Briefcase, ShoppingBag, Tags } from 'lucide-react';
import type { Category, JobCategory, Product, Job } from '@/types';
import { add } from 'date-fns';
import {
  generateMockJobs,
  generateMockProducts,
  generateMockCategories,
} from '@/ai/flows/generate-mock-data';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const generateJobsSchema = z.object({
  count: z.coerce.number().int().min(1, "At least 1 job").max(20, "Max 20 jobs"),
  prompt: z.string().optional(),
  minCompensation: z.coerce.number().optional(),
  maxCompensation: z.coerce.number().optional(),
}).refine(data => {
    if (data.minCompensation !== undefined && data.maxCompensation !== undefined) {
        return data.maxCompensation >= data.minCompensation;
    }
    return true;
}, { message: "Max must be greater than or equal to min", path: ["maxCompensation"] });
type GenerateJobsValues = z.infer<typeof generateJobsSchema>;

const RANDOM_CATEGORY_VALUE = "__RANDOM__";

const generateProductsSchema = z.object({
  count: z.coerce.number().int().min(1, "At least 1 product").max(20, "Max 20 products"),
  categoryId: z.string().min(1, "Please select a category."),
  prompt: z.string().optional(),
});
type GenerateProductsValues = z.infer<typeof generateProductsSchema>;

const generateCategoriesSchema = z.object({
  count: z.coerce.number().int().min(1, "At least 1 category").max(10, "Max 10 categories"),
  prompt: z.string().optional(),
});
type GenerateCategoriesValues = z.infer<typeof generateCategoriesSchema>;


type ModalDataType = 'jobs' | 'products' | 'categories';
type GeneratedData = Job[] | Product[] | Category[];

export default function MockDataGeneratorPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const [isLoading, setIsLoading] = useState({ jobs: false, products: false, categories: false });
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<GeneratedData | null>(null);
  const [modalDataType, setModalDataType] = useState<ModalDataType | null>(null);
  
  const jobsForm = useForm<GenerateJobsValues>({ resolver: zodResolver(generateJobsSchema), defaultValues: {prompt: '', count: 5} });
  const productsForm = useForm<GenerateProductsValues>({ resolver: zodResolver(generateProductsSchema), defaultValues: {prompt: '', count: 5} });
  const categoriesForm = useForm<GenerateCategoriesValues>({ resolver: zodResolver(generateCategoriesSchema), defaultValues: {prompt: '', count: 3} });

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
  
  const handleGenerationResult = (data: GeneratedData, type: ModalDataType) => {
    setModalContent(data);
    setModalDataType(type);
    setModalOpen(true);
  };

  const onJobsSubmit: SubmitHandler<GenerateJobsValues> = async (data) => {
    if (!currentUser || !dataService || jobCategories.length === 0) {
      toast({ title: "Prerequisites Missing", description: "Admin user, data service, or job categories not found.", variant: "destructive"});
      return;
    }
    setIsLoading(prev => ({ ...prev, jobs: true }));
    try {
      const result = await generateMockJobs(data);
      if (!result || !result.jobs || result.jobs.length === 0) throw new Error("AI did not return any jobs.");
      handleGenerationResult(result.jobs as unknown as Job[], 'jobs');
    } catch (error: any) {
      toast({ title: "Error Generating Jobs", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(prev => ({ ...prev, jobs: false }));
    }
  };
  
  const onProductsSubmit: SubmitHandler<GenerateProductsValues> = async (data) => {
    if (!currentUser || !dataService) return;
    const isRandom = data.categoryId === RANDOM_CATEGORY_VALUE;
    
    if (productCategories.length === 0) {
        toast({ title: "Prerequisites Missing", description: "No product categories exist to assign products to.", variant: "destructive"});
        return;
    }

    setIsLoading(prev => ({ ...prev, products: true }));
    try {
      const categoryNameForAI = isRandom 
        ? undefined 
        : productCategories.find(c => c.id === data.categoryId)?.name;
        
      if (!isRandom && !categoryNameForAI) {
        throw new Error("Selected category not found.");
      }
      
      const result = await generateMockProducts({ count: data.count, categoryName: categoryNameForAI, prompt: data.prompt });
      
      if (!result || !result.products || result.products.length === 0) throw new Error("AI did not return any products.");
      
      const productsWithCategory = result.products.map(p => {
          let assignedCatId: string;
          let assignedCatName: string | undefined;

          if (isRandom) {
              const randomCat = productCategories[Math.floor(Math.random() * productCategories.length)];
              assignedCatId = randomCat.id;
              assignedCatName = randomCat.name;
          } else {
              assignedCatId = data.categoryId;
              assignedCatName = categoryNameForAI;
          }

          return {
            ...p,
            categoryId: assignedCatId,
            categoryName: assignedCatName, // For display in modal
          };
      });

      handleGenerationResult(productsWithCategory as unknown as Product[], 'products');

    } catch (error: any) {
      toast({ title: "Error Generating Products", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(prev => ({ ...prev, products: false }));
    }
  };

  const onCategoriesSubmit: SubmitHandler<GenerateCategoriesValues> = async (data) => {
    if (!currentUser || !dataService) return;
    setIsLoading(prev => ({ ...prev, categories: true }));
    try {
      const result = await generateMockCategories(data);
      if (!result || !result.categories || result.categories.length === 0) throw new Error("AI did not return any categories.");
      handleGenerationResult(result.categories as unknown as Category[], 'categories');
    } catch (error: any) {
      toast({ title: "Error Generating Categories", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const handleConfirmAndSave = async () => {
    if (!modalContent || !modalDataType || !dataService || !currentUser) return;
    setIsLoading({ jobs: true, products: true, categories: true }); // Universal loading state
    setModalOpen(false);

    try {
      if (modalDataType === 'jobs') {
        const jobs = modalContent as Job[];
        for (const job of jobs) {
            const expiresAt = add(new Date(), { days: Math.floor(Math.random() * 7) + 1 });
            const randomCategoryId = jobCategories[Math.floor(Math.random() * jobCategories.length)].id;
            await dataService.addJob({ title: job.title, description: job.description, compensationAmount: job.compensationAmount, location: job.location, createdById: currentUser.id, expiresAt: expiresAt.toISOString(), categoryId: randomCategoryId });
        }
      } else if (modalDataType === 'products') {
        const products = modalContent as Product[];
        for (const product of products) {
            await dataService.addProduct(product);
        }
      } else if (modalDataType === 'categories') {
        const categories = modalContent as Category[];
        for (const category of categories) {
            const slug = category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
            await dataService.addCategory({ name: category.name, description: category.description, slug: slug, parentId: null, imageId: null, displayOrder: 99, isActive: true });
        }
        await fetchCategories(); // Refresh product categories list
      }
      toast({ title: "Success", description: `${modalContent.length} mock ${modalDataType} added.` });
    } catch (error: any) {
        toast({ title: `Error saving ${modalDataType}`, description: error.message, variant: "destructive"});
    } finally {
       setIsLoading({ jobs: false, products: false, categories: false });
       setModalContent(null);
       setModalDataType(null);
    }
  };

  const renderModalContent = (): ReactNode => {
    if (!modalContent || !modalDataType) return null;

    const renderContent = () => {
      switch (modalDataType) {
        case 'jobs':
          return (modalContent as Job[]).map((job, index) => (
            <Card key={index} className="mb-2">
              <CardHeader className="p-3"><CardTitle className="text-base">{job.title}</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                <p className="line-clamp-2">{job.description}</p>
                <div className="flex justify-between mt-2 text-xs">
                    <span>Location: {job.location}</span>
                    <span>Compensation: ${job.compensationAmount?.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ));
        case 'products':
          return (modalContent as Product[]).map((product, index) => (
            <Card key={index} className="mb-2">
              <CardHeader className="p-3"><CardTitle className="text-base">{product.name}</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                <p className="line-clamp-2">{product.description}</p>
                 <div className="flex justify-between mt-2 text-xs">
                    <span>Price: ${product.price.toFixed(2)}</span>
                    <span>Stock: {product.stock}</span>
                </div>
                {product.categoryName && <Badge variant="outline" className="mt-1">Category: {product.categoryName}</Badge>}
              </CardContent>
            </Card>
          ));
        case 'categories':
          return (modalContent as Category[]).map((cat, index) => (
             <Card key={index} className="mb-2">
              <CardHeader className="p-3"><CardTitle className="text-base">{cat.name}</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                <p className="line-clamp-2">{cat.description}</p>
              </CardContent>
            </Card>
          ));
        default:
          return null;
      }
    };

    return (
      <ScrollArea className="max-h-72 mt-4 border rounded-md p-2 bg-muted/50">
        <div className="space-y-2">{renderContent()}</div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl text-primary flex items-center gap-3"><FlaskConical /> AI Mock Data Generator</h1>
        <p className="text-muted-foreground mt-1">Use AI to populate your store with sample data for testing.</p>
      </header>

      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase />Generate Jobs</CardTitle><CardDescription>Create random job postings.</CardDescription></CardHeader>
          <form onSubmit={jobsForm.handleSubmit(onJobsSubmit)}>
            <CardContent className="space-y-4">
                <div><Label htmlFor="job-prompt">Guiding Prompt (Optional)</Label><Textarea id="job-prompt" {...jobsForm.register('prompt')} placeholder="e.g., 'Yard work and landscaping'" /></div>
                <div><Label htmlFor="job-count">Number of Jobs (1-20)</Label><Input id="job-count" type="number" {...jobsForm.register('count')} min="1" max="20" />{jobsForm.formState.errors.count && <p className="text-sm text-destructive mt-1">{jobsForm.formState.errors.count.message}</p>}</div>
                <div className="grid grid-cols-2 gap-2"><Label>Compensation Range</Label><div></div><Input type="number" {...jobsForm.register('minCompensation')} placeholder="Min $" /><Input type="number" {...jobsForm.register('maxCompensation')} placeholder="Max $" /></div>
                {jobsForm.formState.errors.maxCompensation && <p className="text-sm text-destructive mt-1 col-span-2">{jobsForm.formState.errors.maxCompensation.message}</p>}
            </CardContent>
            <CardFooter><Button type="submit" disabled={isLoading.jobs || jobCategories.length === 0}>{isLoading.jobs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate</Button>{jobCategories.length === 0 && <p className="text-xs text-muted-foreground ml-2">Create a job category first.</p>}</CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag />Generate Products</CardTitle><CardDescription>Create random products.</CardDescription></CardHeader>
          <form onSubmit={productsForm.handleSubmit(onProductsSubmit)}>
            <CardContent className="space-y-4">
                <div><Label htmlFor="product-prompt">Guiding Prompt (Optional)</Label><Textarea id="product-prompt" {...productsForm.register('prompt')} placeholder="e.g., 'Handmade leather goods'"/></div>
                <div><Label htmlFor="product-category">Category</Label>
                    <Select onValueChange={(value) => productsForm.setValue('categoryId', value)} defaultValue=""><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={RANDOM_CATEGORY_VALUE}>Random Existing Category</SelectItem>
                        {productCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                    </Select>{productsForm.formState.errors.categoryId && <p className="text-sm text-destructive mt-1">{productsForm.formState.errors.categoryId.message}</p>}
                </div>
                <div><Label htmlFor="product-count">Number of Products (1-20)</Label><Input id="product-count" type="number" {...productsForm.register('count')} min="1" max="20" />{productsForm.formState.errors.count && <p className="text-sm text-destructive mt-1">{productsForm.formState.errors.count.message}</p>}</div>
            </CardContent>
            <CardFooter><Button type="submit" disabled={isLoading.products || productCategories.length === 0}>{isLoading.products && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate</Button>{productCategories.length === 0 && <p className="text-xs text-muted-foreground ml-2">Create a product category first.</p>}</CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Tags />Generate Categories</CardTitle><CardDescription>Create new product categories.</CardDescription></CardHeader>
          <form onSubmit={categoriesForm.handleSubmit(onCategoriesSubmit)}>
            <CardContent className="space-y-4">
                <div><Label htmlFor="cat-prompt">Guiding Prompt (Optional)</Label><Textarea id="cat-prompt" {...categoriesForm.register('prompt')} placeholder="e.g., 'Outdoor adventure gear'" /></div>
                <div><Label htmlFor="category-count">Number of Categories (1-10)</Label><Input id="category-count" type="number" {...categoriesForm.register('count')} min="1" max="10" />{categoriesForm.formState.errors.count && <p className="text-sm text-destructive mt-1">{categoriesForm.formState.errors.count.message}</p>}</div>
            </CardContent>
            <CardFooter><Button type="submit" disabled={isLoading.categories}>{isLoading.categories && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate</Button></CardFooter>
          </form>
        </Card>
      </div>

       <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Generation</AlertDialogTitle>
                    <AlertDialogDescription>AI has generated the following {modalContent?.length} {modalDataType}. Review and confirm to add them to the database.</AlertDialogDescription>
                </AlertDialogHeader>
                {renderModalContent()}
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setModalContent(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAndSave}>Confirm & Add</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
