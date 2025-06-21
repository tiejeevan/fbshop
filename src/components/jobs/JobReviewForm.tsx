
'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/contexts/DataSourceContext';
import type { Job, JobReview, User } from '@/types';

const jobReviewSchema = z.object({
  rating: z.number().min(1, "Rating is required").max(5),
  comment: z.string().min(10, "Comment must be at least 10 characters").max(500, "Comment must be 500 characters or less"),
});

type JobReviewFormValues = z.infer<typeof jobReviewSchema>;

interface JobReviewFormProps {
  job: Job;
  currentUser: User;
  onReviewSubmitted: () => void;
  onCancel: () => void;
}

export function JobReviewForm({ job, currentUser, onReviewSubmitted, onCancel }: JobReviewFormProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<JobReviewFormValues>({
    resolver: zodResolver(jobReviewSchema),
    defaultValues: { rating: 0, comment: '' }
  });

  const currentRating = watch('rating');

  const handleRatingClick = (rate: number) => {
    setValue('rating', rate, { shouldValidate: true });
  };
  
  const isCreator = job.createdById === currentUser.id;
  const revieweeId = isCreator ? job.acceptedById : job.createdById;
  const revieweeName = isCreator ? job.acceptedByName : job.createdByName;

  const onSubmit: SubmitHandler<JobReviewFormValues> = async (data) => {
    if (!dataService || !revieweeId || !revieweeName) {
        toast({ title: "Error", description: "Cannot submit review. Missing required data.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    try {
      const reviewData: Omit<JobReview, 'id' | 'createdAt'> = {
          jobId: job.id,
          reviewerId: currentUser.id,
          reviewerName: currentUser.name || currentUser.email,
          revieweeId,
          revieweeName,
          rating: data.rating,
          comment: data.comment,
      };

      await dataService.addJobReview(reviewData);
      // Log is handled by the dataService
      reset(); 
      onReviewSubmitted(); 
    } catch (error) {
      console.error("Error submitting job review:", error);
      toast({ title: "Submission Error", description: "Could not submit your review.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
        <DialogHeader>
            <DialogTitle className="font-headline">Leave a Review</DialogTitle>
            <DialogDescription>Reviewing {revieweeName} for the job: "{job.title}".</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Your Rating</Label>
            <div className="flex items-center gap-1 mt-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn("h-6 w-6 cursor-pointer transition-colors", (hoverRating || currentRating) >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground hover:text-amber-300")}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoverRating(star)}
                />
              ))}
            </div>
            {errors.rating && <p className="text-sm text-destructive mt-1">{errors.rating.message}</p>}
          </div>
          <div>
            <Label htmlFor="comment">Your Review</Label>
            <Textarea
              id="comment"
              {...register('comment')}
              placeholder="Share your thoughts about their work..."
              rows={4}
              className="mt-1"
            />
            {errors.comment && <p className="text-sm text-destructive mt-1">{errors.comment.message}</p>}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></DialogClose>
          <Button type="submit" disabled={isSubmitting || currentRating === 0 || isDataSourceLoading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Review
          </Button>
        </DialogFooter>
    </form>
  );
}
