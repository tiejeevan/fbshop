
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { localStorageService } from '@/lib/localStorageService';
import type { Product, Category } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search, Star, Eye, Loader2 } from 'lucide-react'; // Removed Camera
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { WishlistButton } from '@/components/customer/WishlistButton';
import { StarRatingDisplay } from '@/components/product/StarRatingDisplay';
import { RecentlyViewedProducts } from '@/components/product/RecentlyViewedProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/product/ProductImage';
import { ProductQuickViewModal } from '@/components/product/ProductQuickViewModal';
// Removed: import { describeImageForSearch } from '@/ai/flows/describe-image-for-search';

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'views-desc' | 'purchases-desc' | 'rating-desc';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewModalOpen, setIsQuickViewModalOpen] = useState(false);
  // Removed: const [isVisualSearching, setIsVisualSearching] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const allProducts = localStorageService.getProducts();
    const allCategories = localStorageService.getCategories();

    const productsWithDetails = allProducts.map(p => {
        const category = allCategories.find(c => c.id === p.categoryId);
        const reviews = localStorageService.getReviewsForProduct(p.id);
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
        return {
          ...p,
          categoryName: category?.name || 'Uncategorized',
          averageRating: averageRating,
          reviewCount: reviews.length,
        };
    });

    setProducts(productsWithDetails);
    setCategories(allCategories);
    setIsLoading(false);
  }, []);

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    if (!currentUser) {
      toast({ title: "Login Required", variant: "destructive", description: "Please log in to add items to your cart." });
      return;
    }

    const cart = localStorageService.getCart(currentUser.id) || { userId: currentUser.id, items: [], updatedAt: new Date().toISOString() };
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity <= product.stock) {
        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        toast({ title: "Stock Limit", variant: "destructive", description: `Max stock: ${product.stock}. You have ${cart.items[existingItemIndex].quantity} in cart.` });
        return;
      }
    } else {
      if (quantity <= product.stock) {
        cart.items.push({
          productId: product.id,
          quantity,
          price: product.price,
          name: product.name,
          primaryImageId: product.primaryImageId,
        });
      } else {
        toast({ title: "Stock Limit", variant: "destructive", description: `Only ${product.stock} units available.` });
        return;
      }
    }
    localStorageService.updateCart(cart);
    toast({ title: "Added to Cart", description: `${quantity} x ${product.name} added.` });
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const sortedAndFilteredProducts = useMemo(() => {
    return products
      .filter(product => (selectedCategory && selectedCategory !== 'all') ? product.categoryId === selectedCategory : true)
      .filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase())) // Reverted to name-only search
      .sort((a, b) => {
        switch (sortOption) {
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
          case 'price-asc': return a.price - b.price;
          case 'price-desc': return b.price - a.price;
          case 'rating-desc': return (b.averageRating || 0) - (a.averageRating || 0);
          case 'views-desc': return (b.views || 0) - (a.views || 0);
          case 'purchases-desc': return (b.purchases || 0) - (a.purchases || 0);
          default: return 0;
        }
      });
  }, [products, selectedCategory, searchTerm, sortOption]);

  const openQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewModalOpen(true);
  };

  const closeQuickView = () => {
    setIsQuickViewModalOpen(false);
    setQuickViewProduct(null);
  };

  // Removed handleMockVisualSearch function

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header className="text-center space-y-2">
          <Skeleton className="h-12 w-3/4 mx-auto rounded-md" />
          <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </header>
        <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card rounded-lg shadow">
          <Skeleton className="h-10 flex-grow rounded-md" />
          {/* Removed skeleton for visual search button */}
          <Skeleton className="h-10 w-full md:w-[200px] rounded-md" />
          <Skeleton className="h-10 w-full md:w-[220px] rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
              <Skeleton className="w-full h-48" />
              <CardContent className="p-4 flex-grow space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <CardFooter className="p-4 border-t mt-auto">
                <div className="flex items-center justify-between w-full">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-9 w-1/2" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <h1 className="font-headline text-5xl text-primary">Our Products</h1>
        <p className="text-lg text-muted-foreground">Discover a wide range of items, stored locally!</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card rounded-lg shadow items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input type="search" placeholder="Search products by name..." value={searchTerm} // Updated placeholder
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full" />
        </div>
        {/* Removed Visual Search Button */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (<SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
          <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="price-asc">Price (Low-High)</SelectItem>
            <SelectItem value="price-desc">Price (High-Low)</SelectItem>
            <SelectItem value="rating-desc">Rating (Highest)</SelectItem>
            <SelectItem value="views-desc">Popularity (Viewed)</SelectItem>
            <SelectItem value="purchases-desc">Popularity (Purchased)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortedAndFilteredProducts.length === 0 ? (
        <p className="text-center text-muted-foreground text-xl py-10">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAndFilteredProducts.map(product => (
              <Card key={product.id} className="overflow-hidden flex flex-col group transform hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="relative">
                  <Link href={`/products/${product.id}`} className="block">
                    <CardHeader className="p-0 relative">
                      <ProductImage
                        imageId={product.primaryImageId}
                        alt={product.name}
                        className="w-full h-48"
                        imageClassName="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        fill={false}
                        width={600}
                        height={400}
                        placeholderIconSize="w-12 h-12"
                        data-ai-hint="product image"
                      />
                      {product.stock === 0 && <Badge variant="destructive" className="absolute top-2 right-2">Out of Stock</Badge>}
                      {product.categoryName && <Badge className="absolute top-2 left-2 bg-primary/80 text-primary-foreground">{product.categoryName}</Badge>}
                    </CardHeader>
                  </Link>
                  {currentUser && <WishlistButton productId={product.id} userId={currentUser.id} className="absolute top-14 right-2 bg-transparent hover:bg-transparent p-1"/>}
                   <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openQuickView(product)}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background text-foreground"
                    >
                      <Eye className="mr-2 h-4 w-4" /> Quick View
                    </Button>
                </div>
                <Link href={`/products/${product.id}`} className="block flex-grow flex flex-col">
                  <CardContent className="p-4 flex-grow">
                    <CardTitle className="font-headline text-xl mb-1 group-hover:text-primary transition-colors">{product.name}</CardTitle>
                     {product.reviewCount && product.reviewCount > 0 && product.averageRating ? (
                      <div className="flex items-center gap-1 text-sm text-amber-500 mb-1">
                        <StarRatingDisplay rating={product.averageRating} size="sm" />
                        <span className="text-muted-foreground">({product.reviewCount})</span>
                      </div>
                    ) : ( <div className="h-5 mb-1 text-sm text-muted-foreground">No reviews</div> )}
                    <CardDescription className="text-sm text-muted-foreground line-clamp-2">{product.description}</CardDescription>
                  </CardContent>
                </Link>
                <CardFooter className="p-4 border-t mt-auto">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-lg font-semibold text-primary">${product.price.toFixed(2)}</p>
                    <Button size="sm" onClick={() => handleAddToCart(product)} disabled={product.stock === 0}
                      className="group-hover:bg-accent group-hover:text-accent-foreground">
                      <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
      <RecentlyViewedProducts />
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          isOpen={isQuickViewModalOpen}
          onClose={closeQuickView}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}
