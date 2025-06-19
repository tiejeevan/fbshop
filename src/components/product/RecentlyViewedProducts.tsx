
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorage';
import type { Product, RecentlyViewedItem } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, ImageOff } from 'lucide-react'; // Added ImageOff
import { Skeleton } from '@/components/ui/skeleton';

const PLACEHOLDER_RECENTLY_VIEWED = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDMwMCAyMjUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VjZWYxYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm95dC1zaXplPSIxNnB4IiBmaWxsPSIjY2NjIj5JbWFnZTwvdGV4dD48L3N2Zz4=";


export function RecentlyViewedProducts() {
  const { currentUser } = useAuth();
  const [viewedProducts, setViewedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      const recentlyViewedItems: RecentlyViewedItem[] = localStorageService.getRecentlyViewed(currentUser.id);
      const productDetails: Product[] = recentlyViewedItems
        .map(item => localStorageService.findProductById(item.productId))
        .filter((product): product is Product => product !== undefined);
      setViewedProducts(productDetails);
      setIsLoading(false);
    } else {
      setViewedProducts([]); 
      setIsLoading(false);
    }
  }, [currentUser]);

  if (!currentUser || viewedProducts.length === 0) {
    return null; 
  }

  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="font-headline text-2xl text-primary mb-4 flex items-center"><Eye className="mr-2 h-6 w-6"/>Recently Viewed</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-muted h-[200px]"><Skeleton className="w-full h-full" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="font-headline text-2xl text-primary mb-4 flex items-center"><Eye className="mr-2 h-6 w-6"/>Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {viewedProducts.map(product => {
          const imageSrc = product.primaryImageDataUri || PLACEHOLDER_RECENTLY_VIEWED;
          return (
            <Link href={`/products/${product.id}`} key={product.id} className="block group">
              <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader className="p-0 relative aspect-[4/3]">
                  {imageSrc === PLACEHOLDER_RECENTLY_VIEWED && !product.primaryImageDataUri ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-t-md" data-ai-hint="product placeholder">
                        <ImageOff className="w-10 h-10 text-muted-foreground"/>
                    </div>
                  ) : (
                    <Image
                      src={imageSrc}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                      data-ai-hint="recently viewed product"
                      unoptimized={imageSrc.startsWith('data:image')}
                    />
                  )}
                </CardHeader>
                <CardContent className="p-2 flex-grow">
                  <CardTitle className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{product.name}</CardTitle>
                  <p className="text-xs text-primary font-semibold">${product.price.toFixed(2)}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
