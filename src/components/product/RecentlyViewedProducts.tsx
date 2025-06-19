
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorage';
import type { Product, RecentlyViewedItem } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';

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
      setViewedProducts([]); // Clear if user logs out
      setIsLoading(false);
    }
  }, [currentUser]);

  if (!currentUser || viewedProducts.length === 0) {
    return null; // Don't render if no user or no recently viewed items
  }

  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="font-headline text-2xl text-primary mb-4 flex items-center"><Eye className="mr-2 h-6 w-6"/>Recently Viewed</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-muted h-[200px]"></Card>
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
          const hasRealImage = product.imageUrl && !product.imageUrl.startsWith('https://placehold.co');
          return (
            <Link href={`/products/${product.id}`} key={product.id} className="block group">
              <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader className="p-0 relative aspect-[4/3]">
                  {hasRealImage ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                      data-ai-hint="recently viewed product"
                    />
                  ) : product.icon ? (
                    <div 
                      className="w-full h-full flex items-center justify-center bg-muted rounded-t-md group-hover:bg-accent/20 transition-colors" 
                      data-ai-hint="product icon"
                      style={{'--icon-cutout-bg': 'hsl(var(--muted))'} as React.CSSProperties}
                    >
                      <span
                        className={cn(product.icon, 'css-icon-base text-primary group-hover:text-accent-foreground')}
                        style={{ transform: 'scale(2)' }} 
                      >
                        {product.icon === 'css-icon-settings' && <span />}
                        {product.icon === 'css-icon-trash' && <i><em /></i>}
                        {product.icon === 'css-icon-file' && <span />}
                      </span>
                    </div>
                  ) : (
                    <Image
                      src={`https://placehold.co/300x225.png?text=${encodeURIComponent(product.name)}`}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                       sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                      data-ai-hint="product placeholder"
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
