
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Briefcase, Settings, Loader2, Save, Image as ImageIcon, ShieldCheck, Flame } from 'lucide-react';
import type { Job, JobSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDataSource } from '@/contexts/DataSourceContext';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const jobSettingsSchema = z.object({
  maxJobsPerUser: z.coerce.number().int().min(1, 'Must be at least 1').max(100, 'Cannot exceed 100'),
  maxTimerDurationDays: z.coerce.number().int().min(1, 'Must be at least 1 day').max(30, 'Cannot exceed 30 days'),
});

type JobSettingsFormValues = z.infer<typeof jobSettingsSchema>;

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [jobSettings, setJobSettings] = useState<JobSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<JobSettingsFormValues>({
    resolver: zodResolver(jobSettingsSchema),
  });

  const fetchData = useCallback(async () => {
    if (isDataSourceLoading || !dataService) return;
    setIsLoading(true);
    try {
      const [fetchedJobs, fetchedSettings] = await Promise.all([
        dataService.getJobs(),
        dataService.getJobSettings(),
      ]);
      setJobs(fetchedJobs);
      setJobSettings(fetchedSettings);
      setValue('maxJobsPerUser', fetchedSettings.maxJobsPerUser);
      setValue('maxTimerDurationDays', fetchedSettings.maxTimerDurationDays);
    } catch (error) {
      console.error("Error fetching jobs data:", error);
      toast({ title: "Error", description: "Could not load jobs data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, toast, setValue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteJob = async () => {
    if (!jobToDelete || !currentUser || !dataService) return;
    const jobId = jobToDelete.id;
    const success = await dataService.deleteJob(jobId);
    if (success) {
      await dataService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'JOB_DELETE',
        entityType: 'Job',
        entityId: jobId,
        description: `Deleted job "${jobToDelete.title}" (ID: ${jobId.substring(0,8)}...).`
      });
      toast({ title: "Job Deleted" });
      fetchData();
    } else {
      toast({ title: "Error Deleting Job", variant: "destructive" });
    }
    setJobToDelete(null);
  };

  const handleToggleVerifyJob = async (job: Job) => {
    if (!dataService || !currentUser) return;
    try {
      const newVerifiedState = !job.isVerified;
      await dataService.updateJob({ id: job.id, isVerified: newVerifiedState });
       await dataService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'JOB_VERIFICATION',
        entityType: 'Job',
        entityId: job.id,
        description: `${newVerifiedState ? 'Verified' : 'Un-verified'} job: "${job.title}".`
      });
      toast({ title: `Job ${newVerifiedState ? 'Verified' : 'Un-verified'}` });
      fetchData();
    } catch (error) {
        console.error("Error updating job verification:", error);
        toast({ title: "Error", description: "Could not update job.", variant: "destructive" });
    }
  };

  const onSettingsSubmit: SubmitHandler<JobSettingsFormValues> = async (data) => {
    if (!dataService || !currentUser) return;
    try {
      await dataService.updateJobSettings(data);
      await dataService.addAdminActionLog({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        actionType: 'JOB_SETTINGS_UPDATE',
        entityType: 'Settings',
        description: `Updated job settings: Max jobs/user to ${data.maxJobsPerUser}, max duration to ${data.maxTimerDurationDays} days.`
      });
      toast({ title: "Job Settings Updated" });
      setJobSettings(data);
    } catch (error) {
      console.error("Error updating job settings:", error);
      toast({ title: "Error", description: "Could not update settings.", variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (status: Job['status']) => {
    switch (status) {
      case 'open': return 'default';
      case 'accepted': return 'secondary';
      case 'completed': return 'default';
      case 'expired': return 'outline';
      default: return 'secondary';
    }
  };


  if (isLoading || isDataSourceLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading job data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary flex items-center gap-3"><Briefcase />Job Management</h1>
          <p className="text-muted-foreground">Oversee all jobs and configure system-wide settings.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Job Settings</CardTitle>
          <CardDescription>Control the rules for job creation across the platform.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSettingsSubmit)}>
            <CardContent className="space-y-4">
                 <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="maxJobsPerUser">Max Active Jobs per User</Label>
                        <Input id="maxJobsPerUser" type="number" {...register('maxJobsPerUser')} />
                        {errors.maxJobsPerUser && <p className="text-sm text-destructive">{errors.maxJobsPerUser.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="maxTimerDurationDays">Max Job Duration (Days)</Label>
                        <Input id="maxTimerDurationDays" type="number" {...register('maxTimerDurationDays')} />
                        {errors.maxTimerDurationDays && <p className="text-sm text-destructive">{errors.maxTimerDurationDays.message}</p>}
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                    Save Settings
                </Button>
            </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Jobs</CardTitle><CardDescription>A list of all jobs on the platform.</CardDescription></CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-10"><p className="text-muted-foreground mb-4">No jobs have been created yet.</p></div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verify</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {jobs.map((job) => (
                        <TableRow key={job.id}>
                        <TableCell>
                            <div className="font-medium">{job.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                               {job.isUrgent && <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1"/>Urgent</Badge>}
                               {job.isVerified && <Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700"><ShieldCheck className="h-3 w-3 mr-1"/>Verified</Badge>}
                            </div>
                        </TableCell>
                        <TableCell>
                          {job.compensationAmount && job.compensationAmount > 0 ? `$${job.compensationAmount.toFixed(2)}` : <Badge variant="secondary">Volunteer</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{job.createdByName}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge></TableCell>
                        <TableCell>
                            <Switch
                                checked={job.isVerified}
                                onCheckedChange={() => handleToggleVerifyJob(job)}
                                aria-label="Toggle job verification"
                             />
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menu</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setJobToDelete(job)} className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
      {jobToDelete && (
        <AlertDialog open onOpenChange={() => setJobToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the job "{jobToDelete.title}". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
