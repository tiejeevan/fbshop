
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Briefcase, Settings, Loader2, Save, ShieldCheck, Flame, Search, PlusCircle, Edit as EditIcon, CheckCircle, ShieldOff, AlertTriangle, Users, Clock, ShoppingBag } from 'lucide-react';
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
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


const jobSettingsSchema = z.object({
  maxJobsPerUser: z.coerce.number().int().min(1, 'Must be at least 1').max(100, 'Cannot exceed 100'),
  maxTimerDurationDays: z.coerce.number().int().min(1, 'Must be at least 1 day').max(30, 'Cannot exceed 30 days'),
  enableJobCreation: z.boolean(),
  requireCompensation: z.boolean(),
  maxCompensationAmount: z.coerce.number().min(0, "Must be positive").max(100000, "Cannot exceed 100,000"),
  allowUserJobEditing: z.boolean(),
  markNewJobsAsUrgent: z.boolean(),
});

type JobSettingsFormValues = z.infer<typeof jobSettingsSchema>;

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [batchJobsToDelete, setBatchJobsToDelete] = useState<string[]>([]);
  const [jobSettings, setJobSettings] = useState<JobSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const [filters, setFilters] = useState({ searchTerm: '', status: 'all' as 'all' | Job['status'], verified: 'all' });
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<JobSettingsFormValues>({
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
      setValue('enableJobCreation', fetchedSettings.enableJobCreation ?? true);
      setValue('requireCompensation', fetchedSettings.requireCompensation ?? false);
      setValue('maxCompensationAmount', fetchedSettings.maxCompensationAmount ?? 10000);
      setValue('allowUserJobEditing', fetchedSettings.allowUserJobEditing ?? true);
      setValue('markNewJobsAsUrgent', fetchedSettings.markNewJobsAsUrgent ?? false);
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

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const search = filters.searchTerm.toLowerCase();
      const searchMatch = search === '' || 
        job.title.toLowerCase().includes(search) ||
        job.createdByName.toLowerCase().includes(search) ||
        (job.acceptedByName && job.acceptedByName.toLowerCase().includes(search)) ||
        job.id.toLowerCase().includes(search);

      const statusMatch = filters.status === 'all' || job.status === filters.status;
      const verifiedMatch = filters.verified === 'all' || (filters.verified === 'yes' && job.isVerified) || (filters.verified === 'no' && !job.isVerified);
      
      return searchMatch && statusMatch && verifiedMatch;
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, filters]);

  const jobStats = useMemo(() => ({
    total: jobs.length,
    open: jobs.filter(j => j.status === 'open').length,
    accepted: jobs.filter(j => j.status === 'accepted').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  }), [jobs]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedJobIds(checked ? filteredJobs.map(j => j.id) : []);
  };

  const handleSelectOne = (jobId: string, checked: boolean) => {
    setSelectedJobIds(prev => checked ? [...prev, jobId] : prev.filter(id => id !== jobId));
  };

  const handleBatchAction = async (action: 'verify' | 'unverify' | 'delete') => {
    if (!dataService || !currentUser || selectedJobIds.length === 0) return;
    
    if (action === 'delete') {
      setBatchJobsToDelete(selectedJobIds);
      return; 
    }
    
    setIsActionLoading(true);
    let successCount = 0;
    const actionVerb = action === 'verify' ? 'Verified' : 'Un-verified';

    for (const jobId of selectedJobIds) {
      const success = await dataService.updateJob({ id: jobId, isVerified: action === 'verify' });
      if (success) successCount++;
    }

    await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: 'admin', actionType: 'JOB_BATCH_UPDATE', description: `${actionVerb} ${successCount} job(s) in a batch action.` });
    
    toast({ title: "Batch Action Complete", description: `${successCount} out of ${selectedJobIds.length} jobs were updated.` });
    setSelectedJobIds([]);
    setIsActionLoading(false);
    fetchData();
  };

  const handleConfirmBatchDelete = async () => {
    if (!dataService || !currentUser || batchJobsToDelete.length === 0) return;
    setIsActionLoading(true);
    let successCount = 0;
    for (const jobId of batchJobsToDelete) {
        const success = await dataService.deleteJob(jobId);
        if (success) successCount++;
    }
    await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: 'admin', actionType: 'JOB_BATCH_DELETE', description: `Deleted ${successCount} job(s) in a batch action.` });
    toast({ title: "Batch Delete Complete", description: `${successCount} out of ${batchJobsToDelete.length} jobs were deleted.` });
    setSelectedJobIds([]);
    setBatchJobsToDelete([]);
    setIsActionLoading(false);
    fetchData();
  };

  const onSettingsSubmit: SubmitHandler<JobSettingsFormValues> = async (data) => {
    if (!dataService || !currentUser) return;
    try {
      await dataService.updateJobSettings(data);
      await dataService.addActivityLog({ 
        actorId: currentUser.id, 
        actorEmail: currentUser.email, 
        actorRole: 'admin', 
        actionType: 'JOB_SETTINGS_UPDATE', 
        entityType: 'Settings', 
        description: `Updated platform job settings.`,
        details: data
      });
      toast({ title: "Job Settings Updated" });
      setJobSettings(data);
    } catch (error) {
      console.error("Error updating job settings:", error);
      toast({ title: "Error", description: "Could not update settings.", variant: "destructive" });
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete || !currentUser || !dataService) return;
    setIsActionLoading(true);
    const success = await dataService.deleteJob(jobToDelete.id);
    if (success) {
      await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: 'admin', actionType: 'JOB_DELETE', entityType: 'Job', entityId: jobToDelete.id, description: `Deleted job "${jobToDelete.title}"`});
      toast({ title: "Job Deleted" });
      fetchData();
    } else {
      toast({ title: "Error Deleting Job", variant: "destructive" });
    }
    setJobToDelete(null);
    setIsActionLoading(false);
  };


  const StatsCard = ({ title, value, icon: Icon, onClick, isActive }: { title: string, value: number, icon: React.ElementType, onClick: () => void, isActive: boolean }) => (
    <button 
        onClick={onClick} 
        className={cn(
            "text-left p-0 rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive && "ring-2 ring-primary border-primary bg-accent/30"
        )}
    >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </button>
  );

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
         <Button asChild><Link href="/admin/jobs/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Job</Link></Button>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard 
                title="Total Jobs" 
                value={jobStats.total} 
                icon={ShoppingBag}
                onClick={() => setFilters(f => ({ ...f, status: 'all' }))}
                isActive={filters.status === 'all'}
            />
            <StatsCard 
                title="Open Jobs" 
                value={jobStats.open} 
                icon={Clock}
                onClick={() => setFilters(f => ({ ...f, status: 'open' }))}
                isActive={filters.status === 'open'}
            />
            <StatsCard 
                title="Accepted Jobs" 
                value={jobStats.accepted} 
                icon={Users}
                onClick={() => setFilters(f => ({ ...f, status: 'accepted' }))}
                isActive={filters.status === 'accepted'}
            />
            <StatsCard 
                title="Completed Jobs" 
                value={jobStats.completed} 
                icon={CheckCircle}
                onClick={() => setFilters(f => ({ ...f, status: 'completed' }))}
                isActive={filters.status === 'completed'}
            />
        </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle>All Jobs</CardTitle>
                <div className="flex flex-wrap gap-2">
                    <Input placeholder="Search jobs..." value={filters.searchTerm} onChange={(e) => setFilters(f => ({...f, searchTerm: e.target.value}))} className="h-9 max-w-xs" />
                    <Select value={filters.status} onValueChange={(v) => setFilters(f => ({...f, status: v as Job['status'] | 'all' }))}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
                    </Select>
                    <Select value={filters.verified} onValueChange={(v) => setFilters(f => ({...f, verified: v}))}>
                        <SelectTrigger className="h-9 w-full sm:w-[140px]"><SelectValue placeholder="Verification" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Verified</SelectItem><SelectItem value="no">Not Verified</SelectItem></SelectContent>
                    </Select>
                </div>
            </div>
             {selectedJobIds.length > 0 && (
                <div className="mt-4 pt-3 border-t flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedJobIds.length} selected</span>
                    <Button size="sm" variant="outline" onClick={() => handleBatchAction('verify')} disabled={isActionLoading}>
                        {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4"/>} Verify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBatchAction('unverify')} disabled={isActionLoading}>
                         {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldOff className="mr-2 h-4 w-4"/>} Un-verify
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBatchAction('delete')} disabled={isActionLoading}>
                         {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4"/>} Delete
                    </Button>
                </div>
             )}
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"><Checkbox checked={selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0} onCheckedChange={(checked) => handleSelectAll(!!checked)} aria-label="Select all" /></TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Accepted By</TableHead>
                        <TableHead>Compensation</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredJobs.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="h-24 text-center">No jobs found.</TableCell></TableRow>
                    ) : filteredJobs.map((job) => (
                        <TableRow key={job.id} data-state={selectedJobIds.includes(job.id) && "selected"}>
                            <TableCell><Checkbox checked={selectedJobIds.includes(job.id)} onCheckedChange={(checked) => handleSelectOne(job.id, !!checked)} /></TableCell>
                            <TableCell>
                                <div className="font-medium">{job.title}</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                {job.isUrgent && <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600"><Flame className="h-3 w-3 mr-1"/>Urgent</Badge>}
                                {job.isVerified && <Badge className="bg-blue-100 text-blue-700 border-none"><ShieldCheck className="h-3 w-3 mr-1"/>Verified</Badge>}
                                </div>
                            </TableCell>
                            <TableCell><Link href={`/users/${job.createdById}`} className="hover:underline text-primary">{job.createdByName}</Link></TableCell>
                            <TableCell>{job.acceptedById ? <Link href={`/users/${job.acceptedById}`} className="hover:underline text-primary">{job.acceptedByName}</Link> : <span className="text-muted-foreground/70">N/A</span>}</TableCell>
                            <TableCell>{job.compensationAmount && job.compensationAmount > 0 ? `$${job.compensationAmount.toFixed(2)}` : <Badge variant="secondary">Volunteer</Badge>}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(job.expiresAt), { addSuffix: true })}</TableCell>
                            <TableCell><Badge variant="outline">{job.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menu</span></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild><Link href={`/admin/jobs/edit/${job.id}`} className="cursor-pointer"><EditIcon className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setJobToDelete(job)} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Job Settings</CardTitle>
          <CardDescription>Control the rules for job creation across the platform.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSettingsSubmit)}>
            <CardContent className="space-y-6">
                 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                     <div className="space-y-1">
                        <Label htmlFor="maxCompensationAmount">Max Compensation ($)</Label>
                        <Input id="maxCompensationAmount" type="number" {...register('maxCompensationAmount')} />
                        {errors.maxCompensationAmount && <p className="text-sm text-destructive">{errors.maxCompensationAmount.message}</p>}
                    </div>
                 </div>
                 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        <Controller name="enableJobCreation" control={control} render={({ field }) => ( <Switch id="enableJobCreation" checked={field.value} onCheckedChange={field.onChange}/> )}/>
                        <Label htmlFor="enableJobCreation">Enable Job Creation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Controller name="requireCompensation" control={control} render={({ field }) => ( <Switch id="requireCompensation" checked={field.value} onCheckedChange={field.onChange}/> )}/>
                        <Label htmlFor="requireCompensation">Require Compensation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Controller name="allowUserJobEditing" control={control} render={({ field }) => ( <Switch id="allowUserJobEditing" checked={field.value} onCheckedChange={field.onChange}/> )}/>
                        <Label htmlFor="allowUserJobEditing">Allow User Edits</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Controller name="markNewJobsAsUrgent" control={control} render={({ field }) => ( <Switch id="markNewJobsAsUrgent" checked={field.value} onCheckedChange={field.onChange}/> )}/>
                        <Label htmlFor="markNewJobsAsUrgent">Urgent by Default</Label>
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

      {jobToDelete && (
        <AlertDialog open onOpenChange={() => setJobToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the job "{jobToDelete.title}". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isActionLoading}>
                {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {batchJobsToDelete.length > 0 && (
        <AlertDialog open onOpenChange={() => setBatchJobsToDelete([])}>
            <AlertDialogContent>
                 <AlertDialogHeader>
                    <AlertDialogTitle>Delete {batchJobsToDelete.length} Jobs?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the selected jobs. This action cannot be undone.</AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmBatchDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isActionLoading}>
                        {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Delete
                    </AlertDialogAction>
                 </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
