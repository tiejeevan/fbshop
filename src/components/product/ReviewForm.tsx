
'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/contexts/DataSourceContext';
import type { User } from '@/types';

const reviewSchema = z.object({
  rating: z.number().min(1, "Rating is required").max(5),
  comment: z.string().min(10, "Comment must be at least 10 characters").max(500, "Comment must be 500 characters or less"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  productId: string;
  currentUser: User;
  onReviewSubmitted: () => void;
}

export function ReviewForm({ productId, currentUser, onReviewSubmitted }: ReviewFormProps) {
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
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    }
  });

  const currentRating = watch('rating');

  const handleRatingClick = (rate: number) => {
    setValue('rating', rate, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<ReviewFormValues> = async (data) => {
    if (!dataService || isDataSourceLoading) {
        toast({ title: "Service Unavailable", description: "Cannot submit review now.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    try {
      await dataService.addReview({
        productId,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        rating: data.rating,
        comment: data.comment,
      }, {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
      });
      
      toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
      reset(); 
      onReviewSubmitted(); 
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({ title: "Submission Error", description: "Could not submit your review. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">Write a Review</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div>
            <Label>Your Rating</Label>
            <div className="flex items-center gap-1 mt-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-6 w-6 cursor-pointer transition-colors",
                    (hoverRating || currentRating) >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground hover:text-amber-300"
                  )}
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
              placeholder="Share your thoughts about the product..."
              rows={4}
              className="mt-1"
            />
            {errors.comment && <p className="text-sm text-destructive mt-1">{errors.comment.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || currentRating === 0 || isDataSourceLoading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Review
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
