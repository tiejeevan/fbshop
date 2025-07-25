
'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobSettings, JobCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import { Loader2, Briefcase, UploadCloud, Trash2, ImagePlus, DollarSign, Flame, Info, Wand2, Calendar as CalendarIcon, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { add, format, setHours, setMinutes } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { enhanceJobDescription } from '@/ai/flows/enhance-job-description';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const MAX_JOB_IMAGES = 5;
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function NewJobPage() {
  const [settings, setSettings] = useState<JobSettings | null>(null);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [userJobsCount, setUserJobsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const isRelist = !!searchParams.get('title');

  const jobFormSchema = useMemo(() => {
    const schema = z.object({
      title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title cannot exceed 100 characters'),
      description: z.string().min(20, 'Description must be at least 20 characters').max(1000, 'Description cannot exceed 1000 characters'),
      categoryId: z.string().min(1, 'Please select a category'),
      compensationAmount: settings?.requireCompensation
        ? z.coerce.number().min(0.01, 'Compensation is required and must be a positive value.')
        : z.coerce.number().min(0, "Compensation must be 0 or more").optional(),
      durationInHours: z.coerce.number().int().min(1, 'Duration must be at least 1 hour'),
      isUrgent: z.boolean().optional(),
      location: z.string().max(100, 'Location cannot exceed 100 characters').optional(),
      preferredDate: z.date().optional(),
      preferredTime: z.string().optional().refine((val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
        message: "Invalid time format (HH:mm)",
      }),
      estimatedDurationHours: z.coerce.number().min(0, "Duration must be positive").optional(),
    });

    if (settings?.maxCompensationAmount) {
      return schema.refine(data => {
        if (data.compensationAmount) {
            return data.compensationAmount <= settings.maxCompensationAmount;
        }
        return true;
      }, {
        message: `Compensation cannot exceed $${settings.maxCompensationAmount}.`,
        path: ['compensationAmount'],
      });
    }

    return schema;
  }, [settings]);
  
  type JobFormValues = z.infer<typeof jobFormSchema>;


  const { register, handleSubmit, control, setValue, getValues, watch, formState: { errors, isSubmitting: isFormProcessing } } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      isUrgent: false,
    }
  });

  const watchedTitle = watch('title');
  const watchedDescription = watch('description');
  const watchedDate = watch('preferredDate');

  useEffect(() => {
    if (isRelist) {
        setValue('title', searchParams.get('title') || '');
        setValue('description', searchParams.get('description') || '');
        setValue('categoryId', searchParams.get('categoryId') || '');
        const comp = searchParams.get('compensationAmount');
        if (comp) setValue('compensationAmount', parseFloat(comp));
        setValue('isUrgent', searchParams.get('isUrgent') === 'true');
        setValue('location', searchParams.get('location') || '');
        setValue('estimatedDurationHours', searchParams.get('estimatedDurationHours') ? Number(searchParams.get('estimatedDurationHours')) : undefined);
        const dateStr = searchParams.get('preferredDate');
        if (dateStr) {
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              setValue('preferredDate', date);
              setValue('preferredTime', format(date, 'HH:mm'));
            }
          } catch (e) {
            console.error("Invalid date for relist:", e);
          }
        }
    }
  }, [isRelist, searchParams, setValue]);

  useEffect(() => {
    if (settings && !isRelist) {
        setValue('isUrgent', settings.markNewJobsAsUrgent);
    }
  }, [settings, isRelist, setValue]);

  
  const fetchPrerequisites = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading) {
      if (!currentUser && !isDataSourceLoading) router.push('/login?redirect=/jobs/new');
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedSettings, userJobs, fetchedJobCategories] = await Promise.all([
        dataService.getJobSettings(),
        dataService.getJobs({ createdById: currentUser.id, status: 'open' }),
        dataService.getJobCategories(),
      ]);
      setSettings(fetchedSettings);
      setUserJobsCount(userJobs.length);
      setJobCategories(fetchedJobCategories);
    } catch (error) {
      console.error("Error fetching job prerequisites:", error);
      toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
      router.push('/jobs');
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, currentUser, toast, router]);

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const totalImages = imageFiles.length + files.length;
        if (totalImages > MAX_JOB_IMAGES) {
            toast({ title: "Image Limit Exceeded", description: `You can only upload a maximum of ${MAX_JOB_IMAGES} images.`, variant: "destructive" });
            return;
        }
        const validFiles = files.filter(file => {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast({ title: "File Too Large", description: `${file.name} is larger than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
                return false;
            }
            return true;
        });
        setImageFiles(prev => [...prev, ...validFiles]);
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
        const newPreviews = [...prev];
        const [removedUrl] = newPreviews.splice(index, 1);
        URL.revokeObjectURL(removedUrl);
        return newPreviews;
    });
  };

  const handleEnhanceDescription = async () => {
    const title = getValues('title');
    const description = getValues('description');
    if (!title || !description) {
      toast({ title: 'Cannot Enhance', description: 'Please provide a title and description first.', variant: 'destructive' });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await enhanceJobDescription({ title, description });
      if (result.enhancedTitle && result.enhancedDescription) {
        setValue('title', result.enhancedTitle, { shouldValidate: true });
        setValue('description', result.enhancedDescription, { shouldValidate: true });
        toast({ title: 'Job Post Enhanced!', description: 'The title and description have been updated by AI.' });
      } else {
        toast({ title: 'AI Enhancement Failed', description: 'Could not get suggestions. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      console.error("Error enhancing job description:", error);
      toast({ title: 'Error', description: 'An unexpected error occurred while enhancing the description.', variant: 'destructive' });
    } finally {
      setIsSuggesting(false);
    }
  };

  useEffect(() => {
    return () => { imagePreviews.forEach(url => URL.revokeObjectURL(url)); };
  }, [imagePreviews]);

  const onSubmit: SubmitHandler<JobFormValues> = async (data) => {
    if (!currentUser || !dataService || !settings) return;
    if (userJobsCount >= settings.maxJobsPerUser && !isRelist) {
        toast({ title: "Limit Reached", description: `You can only have ${settings.maxJobsPerUser} active jobs at a time.`, variant: "destructive" });
        return;
    }
    const expiresAt = add(new Date(), { hours: data.durationInHours });

    let preferredDateISO: string | undefined = undefined;
    if (data.preferredDate) {
      let combinedDate = data.preferredDate;
      if (data.preferredTime) {
        const [hours, minutes] = data.preferredTime.split(':');
        combinedDate = setHours(setMinutes(combinedDate, parseInt(minutes)), parseInt(hours));
      }
      preferredDateISO = combinedDate.toISOString();
    }


    try {
      const newJobData = {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        compensationAmount: data.compensationAmount,
        location: data.location,
        preferredDate: preferredDateISO,
        estimatedDurationHours: data.estimatedDurationHours,
        createdById: currentUser.id,
        expiresAt: expiresAt.toISOString(),
        isUrgent: data.isUrgent || false,
      };
      await dataService.addJob(newJobData, imageFiles);
      toast({ title: "Job Created Successfully!", description: "Your job is now live." });
      router.push('/profile/jobs');
    } catch (error) {
      console.error("Error creating job:", error);
      toast({ title: "Error", description: "Could not create the job.", variant: "destructive" });
    }
  };
  
  if (isLoading || isDataSourceLoading) {
    return <div className="text-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>;
  }
  
  if (!settings) {
    return <div className="text-center py-20 text-destructive">Could not load job settings. Please try again later.</div>
  }

  if (!settings.enableJobCreation) {
    return (
      <Card className="text-center py-10 max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive font-headline">Job Creation Disabled</CardTitle>
          <CardDescription>The site administrator has temporarily disabled new job postings. Please check back later.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const canPostJob = userJobsCount < settings.maxJobsPerUser || isRelist;
  const maxDurationInHours = settings.maxTimerDurationDays * 24;
  const durationOptions = [ { value: 1, label: '1 Hour' }, { value: 6, label: '6 Hours' }, { value: 12, label: '12 Hours' }, { value: 24, label: '1 Day' }, { value: 48, label: '2 Days' }, { value: 72, label: '3 Days' }, { value: 120, label: '5 Days' }, { value: 168, label: '7 Days' }, { value: 240, label: '10 Days' }, ].filter(opt => opt.value <= maxDurationInHours);
  
  return (
    <div className="max-w-2xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl flex items-center gap-3"><Briefcase /> Create a New Job</CardTitle>
                <CardDescription>
                    Post a new job for other users to accept. You have {userJobsCount} active jobs out of your limit of {settings.maxJobsPerUser}.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {isRelist && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Relisting Job</AlertTitle>
                            <AlertDescription>
                                Review the pre-filled details from your expired job and post when you're ready. A new duration must be selected.
                            </AlertDescription>
                        </Alert>
                    )}
                    {canPostJob ? (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="title">Job Title</Label>
                                <Input id="title" {...register('title')} placeholder="e.g., 'Help moving a couch'" />
                                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" {...register('description')} placeholder="Provide details about the job, location, and what's required." rows={6}/>
                                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                            </div>

                            <Button type="button" variant="outline" size="sm" onClick={handleEnhanceDescription} disabled={isSuggesting || !watchedTitle || !watchedDescription}>
                                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                                Improve with AI
                            </Button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="categoryId">Category</Label>
                                    <Controller name="categoryId" control={control} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                                            <SelectTrigger id="categoryId"><SelectValue placeholder="Select a job category" /></SelectTrigger>
                                            <SelectContent>
                                                {jobCategories.length > 0 ? (
                                                    jobCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                                ) : (
                                                    <SelectItem value="" disabled>No job categories available</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}/>
                                    {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
                                    {jobCategories.length === 0 && <p className="text-xs text-muted-foreground">Admins need to create job categories first.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>Location (Optional)</Label>
                                    <Input id="location" {...register('location')} placeholder="e.g., Downtown" />
                                    {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="compensationAmount" className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground"/>Compensation ($) {settings.requireCompensation ? '' : '(Optional)'}</Label>
                                    <Input id="compensationAmount" {...register('compensationAmount')} type="number" step="0.01" min="0" placeholder="e.g. 25.00" />
                                    {errors.compensationAmount && <p className="text-sm text-destructive">{errors.compensationAmount.message}</p>}
                                    {!settings.requireCompensation && <p className="text-xs text-muted-foreground">Leave blank or set to 0 for volunteer jobs.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="estimatedDurationHours" className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/>Estimated Duration (Hours)</Label>
                                    <Input id="estimatedDurationHours" {...register('estimatedDurationHours')} type="number" step="0.5" min="0" placeholder="e.g., 2.5" />
                                    {errors.estimatedDurationHours && <p className="text-sm text-destructive">{errors.estimatedDurationHours.message}</p>}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                 <div className="space-y-1.5">
                                    <Label>Preferred Date (Optional)</Label>
                                    <Controller name="preferredDate" control={control} render={({ field }) => (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                        </Popover>
                                    )} />
                                    {errors.preferredDate && <p className="text-sm text-destructive">{errors.preferredDate.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="preferredTime">Preferred Time (Optional)</Label>
                                    <Input id="preferredTime" type="time" {...register('preferredTime')} disabled={!watchedDate}/>
                                    {errors.preferredTime && <p className="text-sm text-destructive">{errors.preferredTime.message}</p>}
                                </div>
                            </div>


                             <div className="space-y-3 border p-4 rounded-md bg-muted/30">
                                <Label className="font-medium flex items-center gap-2"><ImagePlus/>Add Images (Optional)</Label>
                                <p className="text-xs text-muted-foreground">Visually describe the task. Max {MAX_JOB_IMAGES} images, {MAX_FILE_SIZE_MB}MB each.</p>
                                <Input id="jobImageUpload" type="file" accept="image/*" multiple onChange={handleImageChange} disabled={imageFiles.length >= MAX_JOB_IMAGES} className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                                {imagePreviews.length > 0 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="relative group aspect-square">
                                                <Image src={preview} alt={`Job preview ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md border" data-ai-hint="job image preview" />
                                                <Button type="button" variant="destructive" size="icon" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <Trash2 className="h-3 w-3"/>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="space-y-1.5">
                                    <Label htmlFor="durationInHours">Job Post Expires In (Timer)</Label>
                                    <Controller name="durationInHours" control={control} defaultValue={24} render={({ field }) => (
                                        <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                                            <SelectTrigger id="durationInHours"><SelectValue placeholder="Select how long the job is available" /></SelectTrigger>
                                            <SelectContent>
                                                {durationOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}/>
                                    {errors.durationInHours && <p className="text-sm text-destructive">{errors.durationInHours.message}</p>}
                                </div>
                                <div className="flex items-center space-x-2 pt-4">
                                     <Controller name="isUrgent" control={control} render={({ field }) => (
                                        <Switch id="isUrgent" checked={field.value} onCheckedChange={field.onChange}/>
                                      )}/>
                                    <Label htmlFor="isUrgent" className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-orange-500"/>Mark as Urgent</Label>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-6 bg-muted rounded-md">
                            <h3 className="font-semibold text-lg text-destructive">Job Limit Reached</h3>
                            <p className="text-muted-foreground">You cannot post new jobs until one of your active jobs is completed or expires.</p>
                        </div>
                    )}
                </CardContent>
                {canPostJob && (
                    <CardFooter>
                        <Button type="submit" disabled={isFormProcessing || jobCategories.length === 0}>
                            {isFormProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Post Job
                        </Button>
                    </CardFooter>
                )}
            </form>
        </Card>
    </div>
  );
}
