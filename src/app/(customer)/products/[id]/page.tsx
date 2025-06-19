
'use client';

import React, { useEffect, useState, use } from 'react'; 
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category, Review as ReviewType } from '@/types';
import { ArrowLeft, ShoppingCart, Minus, Plus, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WishlistButton } from '@/components/customer/WishlistButton';
import { ReviewList } from '@/components/product/ReviewList';
import { ReviewForm } from '@/components/product/ReviewForm';
import { StarRatingDisplay } from '@/components/product/StarRatingDisplay';

export default function ProductDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) { 
  const params = use(paramsPromise); 
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchProductData = React.useCallback(() => {
    const fetchedProduct = localStorageService.findProductById(params.id); 
    if (fetchedProduct) {
      setProduct(fetchedProduct);
      if (fetchedProduct.categoryId) {
        const fetchedCategory = localStorageService.findCategoryById(fetchedProduct.categoryId);
        setCategory(fetchedCategory || null);
      }
      // Record view
      if(currentUser) { // Only track views for logged-in users perhaps, or make it global
        localStorageService.addRecentlyViewed(currentUser.id, fetchedProduct.id);
      }
      // Do not increment views here, let localStorageService handle it centrally if desired, or track differently
      // localStorageService.updateProduct({ ...fetchedProduct, views: (fetchedProduct.views || 0) + 1 });

      // Fetch reviews
      const productReviews = localStorageService.getReviewsForProduct(params.id);
      setReviews(productReviews);
      const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
      setAverageRating(productReviews.length > 0 ? totalRating / productReviews.length : 0);

    } else {
      toast({ title: "Product Not Found", description: "The product you are looking for does not exist.", variant: "destructive" });
      router.push('/products');
    }
    setIsLoading(false);
  }, [params.id, router, toast, currentUser]);

  useEffect(() => {
    setIsLoading(true);
    fetchProductData();
  }, [fetchProductData]); 

  const handleQuantityChange = (amount: number) => {
    if (!product) return;
    setQuantity(prev => {
      const newQuantity = prev + amount;
      if (newQuantity < 1) return 1;
      if (newQuantity > product.stock) return product.stock;
      return newQuantity;
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to add items to your cart.", variant: "destructive" });
      router.push(`/login?redirect=/products/${product.id}`);
      return;
    }

    const cart = localStorageService.getCart(currentUser.id) || { userId: currentUser.id, items: [], updatedAt: new Date().toISOString() };
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity <= product.stock) {
        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        toast({ title: "Stock Limit", description: `Cannot add more. Max stock available: ${product.stock}. You have ${cart.items[existingItemIndex].quantity} in cart.`, variant: "destructive" });
        return;
      }
    } else {
       if (quantity <= product.stock) {
        cart.items.push({ 
            productId: product.id, 
            quantity, 
            price: product.price, 
            name: product.name, 
            imageUrl: product.imageUrl, 
            icon: product.icon 
        });
      } else {
        toast({ title: "Stock Limit", description: `Cannot add ${quantity}. Max stock available: ${product.stock}.`, variant: "destructive" });
        return;
      }
    }
    localStorageService.updateCart(cart);
    toast({ title: "Added to Cart", description: `${quantity} x ${product.name} added to your cart.` });
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const onReviewSubmitted = () => {
    // Re-fetch reviews and update average rating
    const productReviews = localStorageService.getReviewsForProduct(params.id);
    setReviews(productReviews);
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    setAverageRating(productReviews.length > 0 ? totalRating / productReviews.length : 0);
     // Potentially update product in localStorage with new averageRating and reviewCount
    const currentProduct = localStorageService.findProductById(params.id);
    if (currentProduct) {
        localStorageService.updateProduct({
            ...currentProduct,
            averageRating: productReviews.length > 0 ? totalRating / productReviews.length : 0,
            reviewCount: productReviews.length,
        });
    }
  };


  if (isLoading) {
    return <div className="text-center py-20">Loading product details...</div>;
  }

  if (!product) {
    return <div className="text-center py-20 text-destructive">Product not found.</div>;
  }
  
  const hasRealImage = product.imageUrl && !product.imageUrl.startsWith('https://placehold.co');

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" onClick={() => router.back()} className="mb-8 group">
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Products
      </Button>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="bg-card p-4 rounded-lg shadow-lg aspect-square relative">
          {hasRealImage ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={600}
              height={600}
              className="w-full h-full object-contain rounded-md"
              data-ai-hint="product image"
              priority
            />
          ) : product.icon ? (
            <div 
              className="w-full h-full flex items-center justify-center bg-muted rounded-md" 
              data-ai-hint="product icon"
              style={{'--icon-cutout-bg': 'hsl(var(--muted))'} as React.CSSProperties}
            >
              <span
                className={cn(product.icon, 'css-icon-base text-primary')}
                style={{ transform: 'scale(5)' }}
              >
                {product.icon === 'css-icon-settings' && <span />}
                {product.icon === 'css-icon-trash' && <i><em /></i>}
                {product.icon === 'css-icon-file' && <span />}
              </span>
            </div>
          ) : (
            <Image
              src={`https://placehold.co/600x600.png?text=${encodeURIComponent(product.name)}`}
              alt={product.name}
              width={600}
              height={600}
              className="w-full h-full object-contain rounded-md"
              data-ai-hint="product image placeholder"
              priority
            />
          )}
          {currentUser && <WishlistButton productId={product.id} userId={currentUser.id} className="absolute top-2 right-2 bg-transparent hover:bg-transparent p-1" />}
        </div>

        <div className="space-y-6">
          {category && (
             <Link href={`/products?category=${category.id}`} passHref>
                <Badge variant="secondary" className="text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">{category.name}</Badge>
             </Link>
          )}
          <h1 className="font-headline text-4xl lg:text-5xl text-primary">{product.name}</h1>
           {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRatingDisplay rating={averageRating} />
              <span className="text-muted-foreground text-sm">({reviews.length} review{reviews.length === 1 ? '' : 's'})</span>
            </div>
          )}
          <p className="text-2xl font-semibold text-foreground">${product.price.toFixed(2)}</p>
          
          <div className="prose prose-lg max-w-none text-muted-foreground dark:prose-invert">
            <h2 className="font-headline text-xl text-foreground mb-2">Description</h2>
            <p>{product.description}</p>
          </div>

          {product.stock > 0 ? (
            <Badge className="text-sm">In Stock: {product.stock} units</Badge>
          ) : (
            <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
          )}

          {product.stock > 0 && (
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1} aria-label="Decrease quantity">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(1)} disabled={quantity >= product.stock} aria-label="Increase quantity">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="lg" onClick={handleAddToCart} className="flex-grow sm:flex-grow-0">
                <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
              </Button>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground pt-4 border-t">
            <p>Product ID: {product.id}</p>
            <p>Views: {product.views || 0}</p>
            <p>Purchases: {product.purchases || 0}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 space-y-8">
        <h2 className="font-headline text-3xl text-primary border-b pb-2">Customer Reviews</h2>
        {currentUser ? (
          <ReviewForm productId={product.id} userId={currentUser.id} userName={currentUser.name || 'Anonymous'} onReviewSubmitted={onReviewSubmitted} />
        ) : (
          <p className="text-muted-foreground">Please <Link href={`/login?redirect=/products/${product.id}`} className="text-primary hover:underline">login</Link> to leave a review.</p>
        )}
        <ReviewList reviews={reviews} />
      </div>
    </div>
  );
}
