'use client';

import React from 'react';
import type { Review } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRatingDisplay } from './StarRatingDisplay';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


interface ReviewListProps {
  reviews: Review[];
  adminView?: boolean;
  onDeleteReview?: (reviewId: string) => void;
}

export function ReviewList({ reviews, adminView = false, onDeleteReview }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p className="text-muted-foreground">No reviews yet for this product.</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <Card key={review.id} className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${review.userName.charAt(0)}`} alt={review.userName} data-ai-hint="user avatar"/>
                    <AvatarFallback>{review.userName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-md font-semibold">{review.userName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </p>
                </div>
                </div>
                {adminView && onDeleteReview && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this review by {review.userName}? This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteReview(review.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Delete Review
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
                )}
            </div>
            <div className="mt-2">
              <StarRatingDisplay rating={review.rating} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{review.comment}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}