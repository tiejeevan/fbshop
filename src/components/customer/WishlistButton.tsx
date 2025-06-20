
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useAuth } from '@/hooks/useAuth';

interface WishlistButtonProps {
  productId: string;
  // userId is derived from useAuth
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Local loading state for wishlist status check
  const { toast } = useToast();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { currentUser, isLoading: isAuthLoading } = useAuth();

  const checkWishlistStatus = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading || isAuthLoading) {
      setIsLoading(true); // Keep loading if dependencies aren't ready
      return;
    }
    setIsLoading(true);
    try {
      const status = await dataService.isProductInWishlist(currentUser.id, productId);
      setIsInWishlist(status);
    } catch (error) {
      console.error("Error checking wishlist status:", error);
      // Optionally toast an error or handle silently
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, productId, dataService, isDataSourceLoading, isAuthLoading]);

  useEffect(() => {
    checkWishlistStatus();
    
    const handleWishlistUpdate = (event: Event) => {
        // Check if the update is for this specific product or a general update
        const detail = (event as CustomEvent).detail;
        if (!detail || detail.productId === productId || detail.isGeneralUpdate) {
            checkWishlistStatus();
        }
    };
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, [checkWishlistStatus, productId]);

  const toggleWishlist = async () => {
    if (!currentUser || !dataService || isLoading) return; // Prevent action if not logged in or still loading status
    setIsLoading(true); // Indicate operation in progress
    try {
      if (isInWishlist) {
        await dataService.removeFromWishlist(currentUser.id, productId);
        toast({ title: 'Removed from Wishlist' });
        setIsInWishlist(false);
      } else {
        await dataService.addToWishlist(currentUser.id, productId);
        toast({ title: 'Added to Wishlist' });
        setIsInWishlist(true);
      }
      // Dispatch general update or specific product update
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
  
  if (!currentUser) return null; // Don't render if not logged in (after loading checks)


  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleWishlist}
      className={cn("rounded-full p-2 text-muted-foreground hover:text-destructive", isInWishlist && "text-destructive", className)}
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      disabled={isLoading} // Disable during async operations
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Heart className={cn("h-5 w-5", isInWishlist && "fill-destructive")} />}
    </Button>
  );
}
