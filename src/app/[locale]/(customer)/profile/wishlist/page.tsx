
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorageService';
import type { Product, WishlistItem } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartCrack, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductImage } from '@/components/product/ProductImage'; // Import new component

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
        .sort((a,b) => {
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
    toast({ title: "Removed from Wishlist" });
    window.dispatchEvent(new CustomEvent('wishlistUpdated'));
  };

  const handleAddToCart = (product: Product) => {
    if (!currentUser) {
      toast({ title: "Login Required", variant: "destructive" }); return;
    }
    const cart = localStorageService.getCart(currentUser.id) || { userId: currentUser.id, items: [], savedForLaterItems: [], updatedAt: new Date().toISOString() };
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);
    if (existingItemIndex > -1) {
      if (cart.items[existingItemIndex].quantity < product.stock) cart.items[existingItemIndex].quantity += 1;
      else { toast({ title: "Stock Limit", variant: "destructive" }); return; }
    } else {
      if (product.stock > 0) cart.items.push({ productId: product.id, quantity: 1, price: product.price, name: product.name, primaryImageId: product.primaryImageId });
      else { toast({ title: "Out of Stock", variant: "destructive" }); return; }
    }
    localStorageService.updateCart(cart);
    toast({ title: "Added to Cart", description: `${product.name} added.` });
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  if (authLoading || isLoading) return <div className="text-center py-10">Loading...</div>;
  if (!currentUser) return <div className="text-center py-10">Please <Link href="/login?redirect=/profile/wishlist" className="text-primary hover:underline">login</Link>.</div>;

  if (wishlistProducts.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <HeartCrack className="h-24 w-24 mx-auto text-muted-foreground" />
        <h1 className="font-headline text-4xl text-primary">Wishlist is Empty</h1>
        <Button asChild size="lg"><Link href="/products"><ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-headline text-4xl text-primary">My Wishlist</h1>
        <p className="text-muted-foreground">Products saved for later.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistProducts.map(product => (
            <Card key={product.id} className="overflow-hidden flex flex-col group">
              <Link href={`/products/${product.id}`} className="block">
                <CardHeader className="p-0 relative">
                   <ProductImage
                        imageId={product.primaryImageId}
                        alt={product.name}
                        className="w-full h-48"
                        imageClassName="object-cover"
                        width={600} height={400} // Base dimensions for aspect ratio
                        placeholderIconSize="w-12 h-12"
                        data-ai-hint="wishlist item"
                    />
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <CardTitle className="font-headline text-xl mb-1 group-hover:text-primary transition-colors">{product.name}</CardTitle>
                  <p className="text-lg font-semibold text-primary">${product.price.toFixed(2)}</p>
                </CardContent>
              </Link>
              <CardFooter className="p-4 border-t mt-auto flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => handleRemoveFromWishlist(product.id)}>
                  <HeartCrack className="mr-2 h-4 w-4 text-destructive" /> Remove
                </Button>
                <Button size="sm" onClick={() => handleAddToCart(product)} disabled={product.stock === 0}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                </Button>
              </CardFooter>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
