
'use client';

import React from 'react';
import type { JobReview } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRatingDisplay } from '@/components/product/StarRatingDisplay';
import { formatDistanceToNow } from 'date-fns';
import { ClipboardList } from 'lucide-react';

interface JobReviewListProps {
  reviews: JobReview[];
}

export function JobReviewList({ reviews }: JobReviewListProps) {
  if (reviews.length === 0) {
    return (
        <div className="text-center py-10 border rounded-lg bg-muted/30">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No reviews have been left for this user yet.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <Card key={review.id} className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${review.reviewerName.charAt(0)}`} alt={review.reviewerName} data-ai-hint="user avatar"/>
                        <AvatarFallback>{review.reviewerName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-md font-semibold">{review.reviewerName}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                </div>
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
