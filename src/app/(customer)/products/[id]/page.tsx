
'use client';

import React, { useEffect, useState, use, useCallback } from 'react'; 
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category, Review as ReviewType } from '@/types';
import { ArrowLeft, ShoppingCart, Minus, Plus, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, ImageOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WishlistButton } from '@/components/customer/WishlistButton';
import { ReviewList } from '@/components/product/ReviewList';
import { ReviewForm } from '@/components/product/ReviewForm';
import { StarRatingDisplay } from '@/components/product/StarRatingDisplay';
import { Skeleton } from '@/components/ui/skeleton';

const PLACEHOLDER_IMAGE_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDYwMCA0NTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm95dC1zaXplPSIyNHB4IiBmaWxsPSIjYWFhIj5Qcm9kdWN0IEltYWdlPC90ZXh0Pjwvc3ZnPg==";


export default function ProductDetailPage({ params: paramsPromise }: { params: Promise<{ id:string }> }) { 
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

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [allProductImages, setAllProductImages] = useState<string[]>([]); // Will store Data URIs
  const [isZoomed, setIsZoomed] = useState(false);

  const fetchProductData = useCallback(() => {
    const fetchedProduct = localStorageService.findProductById(params.id); 
    if (fetchedProduct) {
      setProduct(fetchedProduct);
      const images = [
        fetchedProduct.primaryImageDataUri, 
        ...(fetchedProduct.additionalImageDataUris || [])
      ].filter((img): img is string => !!img); // Filter out null/undefined and ensure type is string
      setAllProductImages(images);

      if (fetchedProduct.categoryId) {
        const fetchedCategory = localStorageService.findCategoryById(fetchedProduct.categoryId);
        setCategory(fetchedCategory || null);
      }
      if(currentUser) { // Record view only if product exists and user is logged in
        localStorageService.addRecentlyViewed(currentUser.id, fetchedProduct.id);
      }
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
            primaryImageDataUri: product.primaryImageDataUri 
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
    const productReviews = localStorageService.getReviewsForProduct(params.id);
    setReviews(productReviews);
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    setAverageRating(productReviews.length > 0 ? totalRating / productReviews.length : 0);
    const currentProduct = localStorageService.findProductById(params.id);
    if (currentProduct) {
        localStorageService.updateProduct({
            ...currentProduct,
            averageRating: productReviews.length > 0 ? totalRating / productReviews.length : 0,
            reviewCount: productReviews.length,
        });
    }
  };

  const openImageViewer = (index: number) => {
    if (allProductImages.length > 0) {
      setSelectedImageIndex(index);
      setIsViewerOpen(true);
      setIsZoomed(false);
    }
  };
  const closeImageViewer = useCallback(() => setIsViewerOpen(false), []);
  const nextImage = useCallback(() => {
    if (!allProductImages.length) return;
    setSelectedImageIndex((prevIndex) => (prevIndex + 1) % allProductImages.length);
    setIsZoomed(false);
  }, [allProductImages.length]);
  const prevImage = useCallback(() => {
    if (!allProductImages.length) return;
    setSelectedImageIndex((prevIndex) => (prevIndex - 1 + allProductImages.length) % allProductImages.length);
    setIsZoomed(false);
  }, [allProductImages.length]);
  const toggleZoom = useCallback(() => setIsZoomed(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isViewerOpen) return;
      if (event.key === 'Escape') closeImageViewer();
      if (event.key === 'ArrowRight') nextImage();
      if (event.key === 'ArrowLeft') prevImage();
      if (event.key === '+' || event.key === '=') { event.preventDefault(); toggleZoom(); }
      if (event.key === '-' ) { event.preventDefault(); toggleZoom(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen, closeImageViewer, nextImage, prevImage, toggleZoom]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
         <Button variant="outline" className="mb-8 group w-40"><Skeleton className="h-4 w-full" /></Button>
         <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
                </div>
            </div>
            <div className="space-y-6">
                <Skeleton className="h-6 w-1/4 rounded-md" /> {/* Category Badge */}
                <Skeleton className="h-12 w-3/4 rounded-md" /> {/* Product Name */}
                <Skeleton className="h-6 w-1/3 rounded-md" /> {/* Rating */}
                <Skeleton className="h-8 w-1/4 rounded-md" /> {/* Price */}
                <Skeleton className="h-20 w-full rounded-md" /> {/* Description */}
                <Skeleton className="h-6 w-1/5 rounded-md" /> {/* Stock */}
                <div className="flex items-center gap-4 pt-4">
                    <Skeleton className="h-10 w-28 rounded-md" />
                    <Skeleton className="h-12 w-40 rounded-md" />
                </div>
            </div>
         </div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 text-destructive">Product not found.</div>;
  }
  
  const primaryImageSrc = product.primaryImageDataUri || PLACEHOLDER_IMAGE_DATA_URI;

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" onClick={() => router.back()} className="mb-8 group">
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Products
      </Button>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="space-y-3">
          <div
            className="bg-card p-1 rounded-lg shadow-lg aspect-[4/3] relative overflow-hidden cursor-pointer group"
            onClick={() => openImageViewer(0)}
          >
            {primaryImageSrc === PLACEHOLDER_IMAGE_DATA_URI && !product.primaryImageDataUri ? (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-md" data-ai-hint="product image placeholder">
                    <ImageOff className="w-16 h-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">No image available</p>
                </div>
            ) : (
              <Image
                src={primaryImageSrc}
                alt={product.name}
                fill
                className="object-contain rounded-md transition-transform duration-300 group-hover:scale-105"
                data-ai-hint="product image"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                unoptimized={primaryImageSrc.startsWith('data:image')} // Important for Data URIs
              />
            )}
             <div className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center">
                <Maximize className="h-3 w-3 mr-1" /> Click to view gallery
             </div>
            {currentUser && <WishlistButton productId={product.id} userId={currentUser.id} className="absolute top-2 right-2 bg-card/80 hover:bg-card p-1" />}
          </div>

          {allProductImages.length > 1 && ( // Only show thumbnails if there's more than one image (primary is at index 0)
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {allProductImages.map((imgUri, index) => (
                <div
                  key={index}
                  className={cn(
                    "aspect-square bg-card rounded-md overflow-hidden cursor-pointer border-2 hover:border-primary transition-all",
                    selectedImageIndex === index && isViewerOpen ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
                  )}
                  onClick={() => openImageViewer(index)}
                >
                  <Image
                    src={imgUri}
                    alt={`${product.name} - image ${index + 1}`}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                    data-ai-hint="product thumbnail"
                    unoptimized={imgUri.startsWith('data:image')}
                  />
                </div>
              ))}
            </div>
          )}
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

      {isViewerOpen && allProductImages.length > 0 && (
        <div 
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
            onClick={closeImageViewer}
        >
          <div 
            className="bg-card rounded-lg shadow-2xl relative max-w-4xl max-h-[95vh] w-full flex flex-col p-2 sm:p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
            <Button 
                variant="ghost" size="icon" 
                onClick={closeImageViewer} 
                className="absolute top-2 right-2 z-[70] bg-card/50 hover:bg-card/80 h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                aria-label="Close image viewer"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            <div className="flex-grow flex items-center justify-center overflow-hidden relative aspect-video sm:aspect-[4/3] md:aspect-video">
                <Image
                    key={allProductImages[selectedImageIndex]} 
                    src={allProductImages[selectedImageIndex]}
                    alt={`${product?.name || 'Product'} - Image ${selectedImageIndex + 1}`}
                    fill
                    className={cn(
                        "object-contain transition-transform duration-300 ease-in-out",
                        isZoomed ? "scale-125 sm:scale-150 md:scale-175 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                    )}
                    onClick={toggleZoom}
                    data-ai-hint="product detail large image"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 1000px"
                    unoptimized={allProductImages[selectedImageIndex].startsWith('data:image')}
                />
            </div>
            
            <div className="flex items-center justify-between p-1 sm:p-2 mt-1 sm:mt-2 relative z-[65]">
                <Button variant="outline" size="icon" onClick={prevImage} aria-label="Previous image" disabled={allProductImages.length <= 1}>
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <div className="flex flex-col items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">{selectedImageIndex + 1} / {allProductImages.length}</span>
                    <Button 
                        variant="ghost" size="sm" 
                        onClick={toggleZoom} 
                        className="mt-1 text-muted-foreground hover:text-foreground"
                        aria-label={isZoomed ? "Zoom out" : "Zoom in"}
                    >
                      {isZoomed ? <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5 mr-1" /> : <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />}
                      {isZoomed ? "Zoom Out" : "Zoom In"}
                    </Button>
                </div>
                <Button variant="outline" size="icon" onClick={nextImage} aria-label="Next image" disabled={allProductImages.length <= 1}>
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
            </div>
          </div>
        </div>
      )}

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
