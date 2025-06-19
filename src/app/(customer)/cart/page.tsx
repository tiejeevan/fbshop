
'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { localStorageService } from '@/lib/localStorage';
import type { Cart, CartItem, Product } from '@/types';
import { ArrowLeft, Trash2, ShoppingBag, Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const loadCart = useCallback(() => {
    if (currentUser) {
      setIsLoading(true);
      const userCart = localStorageService.getCart(currentUser.id);
      setCart(userCart);
      setIsLoading(false);
    } else {
      setIsLoading(false); 
    }
  }, [currentUser]);

  useEffect(() => {
    loadCart();
    
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);

  }, [loadCart]);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (!currentUser || !cart) return;

    const productDetails = localStorageService.findProductById(productId);
    if (!productDetails) {
        toast({title: "Error", description: "Product details not found.", variant: "destructive"});
        return;
    }
    
    let updatedQuantity = Math.max(1, newQuantity); 
    if (productDetails.stock < updatedQuantity) {
        toast({title: "Stock Limit", description: `Only ${productDetails.stock} units available for ${productDetails.name}.`, variant: "destructive"});
        updatedQuantity = productDetails.stock;
    }
    if (updatedQuantity === 0 && productDetails.stock > 0) updatedQuantity = 1; 

    const updatedItems = cart.items.map(item =>
      item.productId === productId ? { ...item, quantity: updatedQuantity } : item
    );
    const updatedCart = { ...cart, items: updatedItems };
    setCart(updatedCart); // Optimistic update for UI
    localStorageService.updateCart(updatedCart);
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const handleRemoveItem = (productId: string) => {
    if (!currentUser || !cart) return;
    const updatedItems = cart.items.filter(item => item.productId !== productId);
    const updatedCart = { ...cart, items: updatedItems };
    setCart(updatedCart); // Optimistic update
    localStorageService.updateCart(updatedCart);
    toast({ title: "Item Removed", description: "Product removed from your cart." });
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const subtotal = cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  if (isLoading) {
    return <div className="text-center py-20">Loading your cart...</div>;
  }

  if (!currentUser) {
    router.push('/login?redirect=/cart');
    return <div className="text-center py-20">Please log in to view your cart.</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground" />
        <h1 className="font-headline text-4xl text-primary">Your Cart is Empty</h1>
        <p className="text-lg text-muted-foreground">Looks like you haven&apos;t added anything to your cart yet.</p>
        <Button asChild size="lg">
          <Link href="/products">
            <ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="font-headline text-4xl text-primary mb-8">Your Shopping Cart</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {cart.items.map(item => {
            const productDetails = localStorageService.findProductById(item.productId);
            const hasRealImage = item.imageUrl && !item.imageUrl.startsWith('https://placehold.co');
            const iconToShow = item.icon; // Icon from cart item, which should be from product

            return (
            <Card key={item.productId} className="flex flex-col sm:flex-row items-center gap-4 p-4 shadow-md">
              {hasRealImage ? (
                <Image
                  src={item.imageUrl!}
                  alt={item.name}
                  width={100}
                  height={100}
                  className="w-24 h-24 object-cover rounded-md border"
                  data-ai-hint="product thumbnail"
                />
              ) : iconToShow ? (
                <div 
                  className="w-24 h-24 flex items-center justify-center bg-muted rounded-md border" 
                  data-ai-hint="product icon"
                  style={{'--icon-cutout-bg': 'hsl(var(--muted))'} as React.CSSProperties}
                >
                  <span
                    className={cn(iconToShow, 'css-icon-base text-primary')}
                    style={{ transform: 'scale(1.5)' }}
                  >
                    {iconToShow === 'css-icon-settings' && <span />}
                    {iconToShow === 'css-icon-trash' && <i><em /></i>}
                    {iconToShow === 'css-icon-file' && <span />}
                  </span>
                </div>
              ) : (
                <Image
                  src={`https://placehold.co/100x100.png?text=${encodeURIComponent(item.name)}`}
                  alt={item.name}
                  width={100}
                  height={100}
                  className="w-24 h-24 object-cover rounded-md border"
                  data-ai-hint="product thumbnail placeholder"
                />
              )}
              <div className="flex-grow text-center sm:text-left">
                <Link href={`/products/${item.productId}`} className="hover:underline">
                    <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
                </Link>
                <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                {productDetails && productDetails.stock < item.quantity && <p className="text-xs text-destructive">Warning: Requested quantity exceeds stock ({productDetails.stock})</p>}
              </div>
              <div className="flex items-center gap-2 my-2 sm:my-0">
                <Button variant="outline" size="icon" onClick={() => handleQuantityChange(item.productId, item.quantity - 1)} disabled={item.quantity <= 1}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value))}
                  min="1"
                  max={productDetails?.stock || item.quantity}
                  className="w-16 h-10 text-center"
                  aria-label={`Quantity for ${item.name}`}
                />
                <Button variant="outline" size="icon" onClick={() => handleQuantityChange(item.productId, item.quantity + 1)} disabled={!!productDetails && item.quantity >= productDetails.stock}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-lg font-semibold w-24 text-center sm:text-right">${(item.price * item.quantity).toFixed(2)}</p>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.productId)} className="text-destructive hover:bg-destructive/10" aria-label={`Remove ${item.name} from cart`}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </Card>
          )})}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">FREE (Simulated)</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-4">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full" asChild>
                <Link href="/checkout">
                  Proceed to Checkout <ShoppingBag className="ml-2 h-5 w-5"/>
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
