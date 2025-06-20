
'use client';

import React from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { useProductImage } from '@/hooks/useProductImage';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  imageId: string | null | undefined;
  alt: string;
  className?: string;
  placeholderType?: 'icon' | 'skeleton';
  placeholderClassName?: string;
  placeholderIconSize?: string; // e.g., "w-12 h-12"
  imageClassName?: string; // Class for the NextImage component itself
  width?: number; // For NextImage if fill is not used
  height?: number; // For NextImage if fill is not used
  fill?: boolean; // For NextImage
  sizes?: string; // For NextImage
  priority?: boolean; // For NextImage
  // unoptimized is now determined by the hook based on URL type
  "data-ai-hint"?: string;
}

const PLACEHOLDER_SVG_MINIMAL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";


export function ProductImage({
  imageId,
  alt,
  className,
  placeholderType = 'icon',
  placeholderClassName = "w-full h-full flex items-center justify-center bg-muted rounded-md border",
  placeholderIconSize = "w-10 h-10",
  imageClassName,
  fill,
  width,
  height,
  sizes,
  priority,
  "data-ai-hint": dataAiHint,
}: ProductImageProps) {
  const { imageUrl, isLoading, error, isExternalUrl } = useProductImage(imageId);

  if (isLoading) {
    return <Skeleton className={cn("rounded-md", className)} />;
  }

  if (error || !imageUrl) {
    if (placeholderType === 'skeleton') {
      return <Skeleton className={cn("rounded-md", className)} />;
    }
    return (
      <div className={cn(className, placeholderClassName)} data-ai-hint={dataAiHint || "product image placeholder"}>
        <ImageOff className={cn("text-muted-foreground", placeholderIconSize)} />
      </div>
    );
  }

  // Determine if Next.js should optimize the image.
  // Local blob URLs (from IndexedDB) should not be optimized by Next/Image.
  // External URLs (like Firebase Storage) can be optimized if the domain is whitelisted.
  const unoptimized = !isExternalUrl;

  if (fill) {
     return (
        <div className={cn("relative overflow-hidden", className)} data-ai-hint={dataAiHint}>
            <Image
                src={imageUrl || PLACEHOLDER_SVG_MINIMAL}
                alt={alt}
                fill
                className={cn("object-contain", imageClassName)}
                sizes={sizes}
                priority={priority}
                unoptimized={unoptimized} 
            />
        </div>
     );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} data-ai-hint={dataAiHint}>
        <Image
            src={imageUrl || PLACEHOLDER_SVG_MINIMAL}
            alt={alt}
            width={width || 100} 
            height={height || 100}
            className={cn("object-contain", imageClassName)}
            sizes={sizes}
            priority={priority}
            unoptimized={unoptimized}
        />
    </div>
  );
}
