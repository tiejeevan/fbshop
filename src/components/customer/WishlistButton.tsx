
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { localStorageService } from '@/lib/localStorage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  userId: string;
  className?: string;
}

export function WishlistButton({ productId, userId, className }: WishlistButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { toast } = useToast();

  const checkWishlistStatus = useCallback(() => {
    setIsInWishlist(localStorageService.isProductInWishlist(userId, productId));
  }, [userId, productId]);

  useEffect(() => {
    checkWishlistStatus();
    // Listen for a custom event that might be dispatched when wishlist changes elsewhere
    // This is a simple way to keep buttons in sync without complex state management
    const handleWishlistUpdate = () => checkWishlistStatus();
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, [checkWishlistStatus]);

  const toggleWishlist = () => {
    if (isInWishlist) {
      localStorageService.removeFromWishlist(userId, productId);
      toast({ title: 'Removed from Wishlist' });
    } else {
      localStorageService.addToWishlist(userId, productId);
      toast({ title: 'Added to Wishlist' });
    }
    setIsInWishlist(!isInWishlist);
    window.dispatchEvent(new CustomEvent('wishlistUpdated')); // Notify other buttons
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleWishlist}
      className={cn("rounded-full p-2 text-muted-foreground hover:text-destructive", isInWishlist && "text-destructive", className)}
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={cn("h-5 w-5", isInWishlist && "fill-destructive")} />
    </Button>
  );
}
