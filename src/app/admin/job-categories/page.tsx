
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, ClipboardList } from 'lucide-react';
import type { JobCategory, Job } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDataSource } from '@/contexts/DataSourceContext';
import { format } from 'date-fns';

export default function AdminJobCategoriesPage() {
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<JobCategory | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const fetchData = useCallback(async () => {
    if (isDataSourceLoading || !dataService) return;
    setIsLoading(true);
    try {
      const [fetchedCategories, fetchedJobs] = await Promise.all([
        dataService.getJobCategories(),
        dataService.getJobs()
      ]);
      setJobCategories(fetchedCategories);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error("Error fetching job categories/jobs:", error);
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryWithJobCount = useMemo(() => {
    return jobCategories.map(cat => ({
      ...cat,
      jobCount: jobs.filter(job => job.categoryId === cat.id).length,
    }));
  }, [jobCategories, jobs]);

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !currentUser || !dataService) return;
    
    const jobsInCategory = jobs.filter(job => job.categoryId === categoryToDelete.id);
    if (jobsInCategory.length > 0) {
      toast({ title: "Cannot Delete", description: `Category is used by ${jobsInCategory.length} job(s). Reassign them first.`, variant: "destructive" });
      setCategoryToDelete(null);
      return;
    }
    
    setIsDeleting(true);
    const categoryName = categoryToDelete.name;
    const categoryId = categoryToDelete.id;

    const success = await dataService.deleteJobCategory(categoryId);
    if (success) {
      await dataService.addActivityLog({
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: 'admin',
        actionType: 'JOB_CATEGORY_DELETE',
        entityType: 'JobCategory',
        entityId: categoryId,
        description: `Deleted job category "${categoryName}" (ID: ${categoryId.substring(0,8)}...).`
      });
      toast({ title: "Job Category Deleted" });
      fetchData();
    } else {
      toast({ title: "Error Deleting Category", variant: "destructive" });
    }
    setIsDeleting(false);
    setCategoryToDelete(null);
  };

  if (isLoading || isDataSourceLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>Loading job categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary flex items-center gap-3">
            <ClipboardList /> Job Category Management
          </h1>
          <p className="text-muted-foreground">Organize the types of jobs available on the platform.</p>
        </div>
        <Button asChild><Link href="/admin/job-categories/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Job Categories</CardTitle>
          <CardDescription>A list of all categories for jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryWithJobCount.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">No job categories yet.</p>
              <Button asChild variant="secondary"><Link href="/admin/job-categories/new"><PlusCircle className="mr-2 h-4 w-4" /> Add First Category</Link></Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryWithJobCount.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="font-mono text-xs">{category.slug}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{category.description || 'N/A'}</TableCell>
                      <TableCell>{category.jobCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(category.createdAt), 'PPP')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/admin/job-categories/edit/${category.id}`} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCategoryToDelete(category)} className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {categoryToDelete && (
        <AlertDialog open onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{categoryToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the category. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
