
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useAuth } from '@/hooks/useAuth';
import type { Product } from '@/types';

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { currentUser, isLoading: isAuthLoading } = useAuth();

  const checkWishlistStatus = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading || isAuthLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      const [status, fetchedProduct] = await Promise.all([
        dataService.isProductInWishlist(currentUser.id, productId),
        dataService.findProductById(productId),
      ]);
      setIsInWishlist(status);
      setProduct(fetchedProduct || null);
    } catch (error) {
      console.error("Error checking wishlist status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, productId, dataService, isDataSourceLoading, isAuthLoading]);

  useEffect(() => {
    checkWishlistStatus();
    
    const handleWishlistUpdate = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (!detail || detail.productId === productId || detail.isGeneralUpdate) {
            checkWishlistStatus();
        }
    };
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, [checkWishlistStatus, productId]);

  const toggleWishlist = async () => {
    if (!currentUser || !dataService || isLoading || !product) return;
    setIsLoading(true);
    try {
      if (isInWishlist) {
        await dataService.removeFromWishlist(currentUser.id, productId);
        await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'WISHLIST_REMOVE', entityType: 'Product', entityId: productId, description: `Removed "${product.name}" from wishlist.` });
        toast({ title: 'Removed from Wishlist' });
        setIsInWishlist(false);
      } else {
        await dataService.addToWishlist(currentUser.id, productId);
        await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'WISHLIST_ADD', entityType: 'Product', entityId: productId, description: `Added "${product.name}" to wishlist.` });
        toast({ title: 'Added to Wishlist' });
        setIsInWishlist(true);
      }
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { productId: productId, isGeneralUpdate: false } }));
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast({ title: "Wishlist Error", description: "Could not update wishlist.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isAuthLoading || isDataSourceLoading) {
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
      onClick={toggleWishlist}
      className={cn("rounded-full p-2 text-muted-foreground hover:text-destructive", isInWishlist && "text-destructive", className)}
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Heart className={cn("h-5 w-5", isInWishlist && "fill-destructive")} />}
    </Button>
  );
}
