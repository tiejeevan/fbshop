'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { localStorageService } from '@/lib/localStorage';
import type { Product, Category } from '@/types';
import { ArrowLeft, ShoppingCart, Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const fetchedProduct = localStorageService.findProductById(params.id);
    if (fetchedProduct) {
      setProduct(fetchedProduct);
      if (fetchedProduct.categoryId) {
        const fetchedCategory = localStorageService.findCategoryById(fetchedProduct.categoryId);
        setCategory(fetchedCategory || null);
      }
      // Increment product views (simplified: only once per page load)
      localStorageService.updateProduct({ ...fetchedProduct, views: fetchedProduct.views + 1 });

    } else {
      // Handle product not found, e.g., redirect or show error
      toast({ title: "Product Not Found", description: "The product you are looking for does not exist.", variant: "destructive" });
      router.push('/products');
    }
    setIsLoading(false);
  }, [params.id, router, toast]);

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
        cart.items.push({ productId: product.id, quantity, price: product.price, name: product.name, imageUrl: product.imageUrl });
      } else {
        toast({ title: "Stock Limit", description: `Cannot add ${quantity}. Max stock available: ${product.stock}.`, variant: "destructive" });
        return;
      }
    }
    localStorageService.updateCart(cart);
    toast({ title: "Added to Cart", description: `${quantity} x ${product.name} added to your cart.` });
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  if (isLoading) {
    return <div className="text-center py-20">Loading product details...</div>;
  }

  if (!product) {
    // This case should be handled by redirect in useEffect, but as a fallback:
    return <div className="text-center py-20 text-destructive">Product not found.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" onClick={() => router.back()} className="mb-8 group">
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Products
      </Button>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="bg-card p-4 rounded-lg shadow-lg">
          <Image
            src={product.imageUrl || `https://placehold.co/600x600.png?text=${encodeURIComponent(product.name)}`}
            alt={product.name}
            width={600}
            height={600}
            className="w-full h-auto object-contain rounded-md aspect-square"
            data-ai-hint="product image"
          />
        </div>

        <div className="space-y-6">
          {category && (
             <Link href={`/products?category=${category.id}`} passHref>
                <Badge variant="secondary" className="text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">{category.name}</Badge>
             </Link>
          )}
          <h1 className="font-headline text-4xl lg:text-5xl text-primary">{product.name}</h1>
          <p className="text-2xl font-semibold text-foreground">${product.price.toFixed(2)}</p>
          
          <div className="prose prose-lg max-w-none text-muted-foreground">
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
            <p>Views: {product.views}</p>
            <p>Purchases: {product.purchases}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
