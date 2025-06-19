
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorage';
import type { Product, WishlistItem } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartCrack, ShoppingCart, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function WishlistPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      const userWishlistItems: WishlistItem[] = localStorageService.getWishlist(currentUser.id);
      const productDetails: Product[] = userWishlistItems
        .map(item => localStorageService.findProductById(item.productId))
        .filter((product): product is Product => product !== undefined)
        .sort((a,b) => { // Sort by when it was added to wishlist (newest first)
            const itemA = userWishlistItems.find(i => i.productId === a.id);
            const itemB = userWishlistItems.find(i => i.productId === b.id);
            return new Date(itemB?.addedAt || 0).getTime() - new Date(itemA?.addedAt || 0).getTime();
        });
      setWishlistProducts(productDetails);
    }
    setIsLoading(false);
  }, [currentUser]);

  const handleRemoveFromWishlist = (productId: string) => {
    if (!currentUser) return;
    localStorageService.removeFromWishlist(currentUser.id, productId);
    setWishlistProducts(prev => prev.filter(p => p.id !== productId));
    toast({ title: "Removed from Wishlist", description: "Product removed from your wishlist." });
    window.dispatchEvent(new CustomEvent('wishlistUpdated')); // For WishlistButton to update
  };

  const handleAddToCart = (product: Product) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to add items to your cart.", variant: "destructive" });
      return;
    }

    const cart = localStorageService.getCart(currentUser.id) || { userId: currentUser.id, items: [], updatedAt: new Date().toISOString() };
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);

    if (existingItemIndex > -1) {
      if (cart.items[existingItemIndex].quantity < product.stock) {
        cart.items[existingItemIndex].quantity += 1;
      } else {
        toast({ title: "Stock Limit", description: `Cannot add more of ${product.name}. Max stock reached.`, variant: "destructive" });
        return;
      }
    } else {
      if (product.stock > 0) {
        cart.items.push({ productId: product.id, quantity: 1, price: product.price, name: product.name, imageUrl: product.imageUrl, icon: product.icon });
      } else {
        toast({ title: "Out of Stock", description: `${product.name} is currently out of stock.`, variant: "destructive" });
        return;
      }
    }
    localStorageService.updateCart(cart);
    toast({ title: "Added to Cart", description: `${product.name} has been added to your cart.` });
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };


  if (authLoading || isLoading) {
    return <div className="text-center py-10">Loading your wishlist...</div>;
  }

  if (!currentUser) {
    return <div className="text-center py-10">Please <Link href="/login?redirect=/profile/wishlist" className="text-primary hover:underline">login</Link> to view your wishlist.</div>;
  }

  if (wishlistProducts.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <HeartCrack className="h-24 w-24 mx-auto text-muted-foreground" />
        <h1 className="font-headline text-4xl text-primary">Your Wishlist is Empty</h1>
        <p className="text-lg text-muted-foreground">Explore products and add your favorites!</p>
        <Button asChild size="lg">
          <Link href="/products">
            <ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-headline text-4xl text-primary">My Wishlist</h1>
        <p className="text-muted-foreground">Products you've saved for later.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistProducts.map(product => {
          const hasRealImage = product.imageUrl && !product.imageUrl.startsWith('https://placehold.co');
          return (
            <Card key={product.id} className="overflow-hidden flex flex-col group">
              <Link href={`/products/${product.id}`} className="block">
                <CardHeader className="p-0 relative">
                  {hasRealImage ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={600}
                      height={400}
                      className="object-cover w-full h-48"
                      data-ai-hint="wishlist product image"
                    />
                  ) : product.icon ? (
                    <div 
                      className="w-full h-48 flex items-center justify-center bg-muted rounded-t-md" 
                      data-ai-hint="product icon"
                      style={{'--icon-cutout-bg': 'hsl(var(--muted))'} as React.CSSProperties}
                      >
                      <span
                        className={cn(product.icon, 'css-icon-base text-primary')}
                        style={{ transform: 'scale(3)' }} 
                      >
                        {product.icon === 'css-icon-settings' && <span />}
                        {product.icon === 'css-icon-trash' && <i><em /></i>}
                        {product.icon === 'css-icon-file' && <span />}
                      </span>
                    </div>
                  ) : (
                     <Image
                        src={`https://placehold.co/600x400.png?text=${encodeURIComponent(product.name)}`}
                        alt={product.name}
                        width={600}
                        height={400}
                        className="object-cover w-full h-48"
                        data-ai-hint="product image placeholder"
                      />
                  )}
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <CardTitle className="font-headline text-xl mb-1 group-hover:text-primary transition-colors">{product.name}</CardTitle>
                  <p className="text-lg font-semibold text-primary">${product.price.toFixed(2)}</p>
                </CardContent>
              </Link>
              <CardFooter className="p-4 border-t mt-auto flex items-center justify-between">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRemoveFromWishlist(product.id)}
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <HeartCrack className="mr-2 h-4 w-4 text-destructive" /> Remove
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock === 0}
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
