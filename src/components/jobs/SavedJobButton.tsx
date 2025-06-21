
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useAuth } from '@/hooks/useAuth';

interface SavedJobButtonProps {
  jobId: string;
  className?: string;
}

export function SavedJobButton({ jobId, className }: SavedJobButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { currentUser, isLoading: isAuthLoading } = useAuth();

  const checkSavedStatus = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading || isAuthLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      const status = await dataService.isJobInSavedList(currentUser.id, jobId);
      setIsSaved(status);
    } catch (error) {
      console.error("Error checking saved job status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, jobId, dataService, isDataSourceLoading, isAuthLoading]);

  useEffect(() => {
    checkSavedStatus();
    
    const handleSavedJobUpdate = () => {
        checkSavedStatus();
    };
    window.addEventListener('savedJobUpdated', handleSavedJobUpdate);
    return () => window.removeEventListener('savedJobUpdated', handleSavedJobUpdate);
  }, [checkSavedStatus]);

  const toggleSavedJob = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!currentUser || !dataService || isLoading) return;
    setIsLoading(true);
    try {
      if (isSaved) {
        await dataService.removeFromSavedJobs(currentUser.id, jobId);
        toast({ title: 'Job Unsaved' });
        setIsSaved(false);
      } else {
        await dataService.addToSavedJobs(currentUser.id, jobId);
        toast({ title: 'Job Saved' });
        setIsSaved(true);
      }
      window.dispatchEvent(new CustomEvent('savedJobUpdated'));
    } catch (error) {
      console.error("Error toggling saved job:", error);
      toast({ title: "Error", description: "Could not update saved jobs.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || isDataSourceLoading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("rounded-full p-2 text-muted-foreground", className)}
        disabled
      >
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }
  
  if (!currentUser) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSavedJob}
      className={cn("rounded-full p-2 text-muted-foreground hover:text-primary", isSaved && "text-primary", className)}
      aria-label={isSaved ? "Unsave this job" : "Save this job"}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Bookmark className={cn("h-5 w-5", isSaved && "fill-primary")} />}
    </Button>
  );
}
