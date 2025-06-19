
'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingDisplayProps {
  rating: number;
  maxStars?: number;
  className?: string;
  starClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRatingDisplay({ rating, maxStars = 5, className, starClassName, size = 'md' }: StarRatingDisplayProps) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5; // Simple half-star logic for display
  const emptyStars = maxStars - fullStars - (halfStar ? 1 : 0);

  const starSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className={cn("text-amber-400 fill-amber-400", starSizeClasses[size], starClassName)} />
      ))}
      {/* For simplicity, not rendering partial stars with masking, just full or empty based on rounding */}
      {/* If you need precise half stars, more complex SVG/masking would be needed */}
      {[...Array(maxStars - fullStars)].map((_, i) => (
        <Star key={`empty-${i}`} className={cn("text-amber-400", starSizeClasses[size], starClassName)} />
      ))}
    </div>
  );
}
