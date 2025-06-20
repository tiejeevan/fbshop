
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Product, RecentlyViewedItem } from '@/types';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/product/ProductImage';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useToast } from '@/hooks/use-toast';

export function RecentlyViewedProducts() {
  const { currentUser } = useAuth();
  const [viewedProducts, setViewedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Component-level loading
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      if (!currentUser || isDataSourceLoading || !dataService) {
        setIsLoading(currentUser && (isDataSourceLoading || !dataService)); // Only load if user exists and service might become available
        if (!currentUser) setViewedProducts([]); // Clear if no user
        return;
      }
      setIsLoading(true);
      try {
        const recentlyViewedItems: RecentlyViewedItem[] = await dataService.getRecentlyViewed(currentUser.id);
        const productDetailsPromises: Promise<Product | undefined>[] = recentlyViewedItems
          .map(item => dataService.findProductById(item.productId));
        
        const resolvedProductDetails = await Promise.all(productDetailsPromises);
        const validProducts = resolvedProductDetails.filter((product): product is Product => product !== undefined);
        
        setViewedProducts(validProducts);
      } catch (error) {
        console.error("Error fetching recently viewed products:", error);
        toast({ title: "Error", description: "Could not load recently viewed items.", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentlyViewed();
  }, [currentUser, dataService, isDataSourceLoading, toast]);

  if (!currentUser || (viewedProducts.length === 0 && !isLoading)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="font-headline text-2xl text-primary mb-4 flex items-center"><Eye className="mr-2 h-6 w-6"/>Recently Viewed</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden h-[200px] flex flex-col">
                <Skeleton className="w-full aspect-[4/3]" />
                <CardContent className="p-2 flex-grow"><Skeleton className="h-4 w-3/4 mt-1"/><Skeleton className="h-3 w-1/2 mt-1"/></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (viewedProducts.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="font-headline text-2xl text-primary mb-4 flex items-center"><Eye className="mr-2 h-6 w-6"/>Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {viewedProducts.map(product => (
            <Link href={`/products/${product.id}`} key={product.id} className="block group">
              <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader className="p-0 relative aspect-[4/3]">
                   <ProductImage
                        imageId={product.primaryImageId}
                        alt={product.name}
                        fill
                        className="w-full h-full"
                        imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                        placeholderIconSize="w-10 h-10"
                        data-ai-hint="recently viewed"
                    />
                </CardHeader>
                <CardContent className="p-2 flex-grow">
                  <CardTitle className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{product.name}</CardTitle>
                  <p className="text-xs text-primary font-semibold">${product.price.toFixed(2)}</p>
                </CardContent>
              </Card>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
