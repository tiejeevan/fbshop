
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorage';
import type { Cart, CartItem, OrderItem, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Lock, Loader2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function CheckoutPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Mock form state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (currentUser) {
      const userCart = localStorageService.getCart(currentUser.id);
      setCart(userCart);
      if (!userCart || userCart.items.length === 0) {
        toast({ title: "Empty Cart", description: "Your cart is empty. Add some products to proceed.", variant: "destructive" });
        router.replace('/products');
      }
    } else {
      router.replace('/login?redirect=/checkout');
    }
    setIsLoading(false);
  }, [currentUser, router, toast]);

  const subtotal = cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const shippingCost = 0; // Mock free shipping
  const totalAmount = subtotal + shippingCost;

  const handleMockPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !cart || cart.items.length === 0) return;

    setIsProcessingPayment(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2500));

    const orderItems: OrderItem[] = cart.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.price,
      name: item.name,
      imageUrl: item.imageUrl,
      icon: item.icon,
    }));

    try {
      const newOrder = localStorageService.addOrder({
        userId: currentUser.id,
        items: orderItems,
        totalAmount: totalAmount,
        status: 'Completed', // Or 'Processing'
        // Mock shipping/payment details if needed
        shippingAddress: { name: currentUser.name || 'Customer', line1: '123 Mock Street', city: 'Fakeville', country: 'Neverland' },
        paymentDetails: { method: 'MockCard', transactionId: `mock_txn_${crypto.randomUUID()}` }
      });

      localStorageService.clearCart(currentUser.id);
      window.dispatchEvent(new CustomEvent('cartUpdated')); // Notify navbar
      
      toast({ title: "Payment Successful!", description: "Your order has been placed." });
      router.push(`/order-confirmation/${newOrder.id}`);

    } catch (error) {
      console.error("Error processing order:", error);
      toast({ title: "Order Error", description: "There was an issue placing your order. Please try again.", variant: "destructive"});
      setIsProcessingPayment(false);
    }
  };

  if (isLoading || (!currentUser && !cart)) {
    return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />Loading checkout...</div>;
  }

  if (!cart || cart.items.length === 0) {
    // This case should be handled by the redirect in useEffect, but as a fallback:
    return (
        <div className="text-center py-20 space-y-6">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground" />
            <h1 className="font-headline text-4xl text-primary">Your Cart is Empty</h1>
            <p className="text-lg text-muted-foreground">Please add products to your cart before proceeding to checkout.</p>
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
      <Button variant="outline" onClick={() => router.push('/cart')} className="mb-8 group">
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Cart
      </Button>
      <h1 className="font-headline text-4xl text-primary mb-8">Checkout</h1>
      
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Payment Details (Mock)</CardTitle>
              <CardDescription>This is a simulated payment form. No real transaction will occur.</CardDescription>
            </CardHeader>
            <form onSubmit={handleMockPayment}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input id="cardName" placeholder="John M. Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input id="cardNumber" placeholder="•••• •••• •••• ••••" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19))} required />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" placeholder="MM/YY" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value.replace(/[^0-9/]/g, '').replace(/^(\d{2})(\d)/g, '$1/$2').slice(0,5))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" placeholder="•••" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0,3))} required />
                  </div>
                </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Your payment information is "securely" mocked.</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" size="lg" className="w-full" disabled={isProcessingPayment}>
                  {isProcessingPayment ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-5 w-5" />
                  )}
                  {isProcessingPayment ? 'Processing Payment...' : `Pay $${totalAmount.toFixed(2)}`}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.items.map(item => {
                const productDetails = localStorageService.findProductById(item.productId);
                const hasRealImage = item.imageUrl && !item.imageUrl.startsWith('https://placehold.co');

                return (
                <div key={item.productId} className="flex items-center gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                    {hasRealImage ? (
                        <Image
                        src={item.imageUrl!}
                        alt={item.name}
                        width={60}
                        height={60}
                        className="w-16 h-16 object-cover rounded-md border"
                        data-ai-hint="checkout item image"
                        />
                    ) : item.icon ? (
                        <div 
                            className="w-16 h-16 flex items-center justify-center bg-muted rounded-md border" 
                            data-ai-hint="product icon"
                            style={{'--icon-cutout-bg': 'hsl(var(--muted))'} as React.CSSProperties}
                        >
                            <span
                                className={cn(item.icon, 'css-icon-base text-primary')}
                                style={{ transform: 'scale(1.2)' }}
                            >
                                {item.icon === 'css-icon-settings' && <span />}
                                {item.icon === 'css-icon-trash' && <i><em /></i>}
                                {item.icon === 'css-icon-file' && <span />}
                            </span>
                        </div>
                    ) : (
                        <Image
                        src={`https://placehold.co/60x60.png?text=${encodeURIComponent(item.name.charAt(0))}`}
                        alt={item.name}
                        width={60}
                        height={60}
                        className="w-16 h-16 object-cover rounded-md border"
                        data-ai-hint="checkout item placeholder"
                        />
                    )}
                  <div className="flex-grow">
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              )})}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold">${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-primary border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

