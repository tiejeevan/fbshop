
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorage';
import type { Order, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function OrderConfirmationPage({ params: paramsPromise }: { params: Promise<{ orderId: string }> }) {
  const params = use(paramsPromise);
  const { currentUser } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser && params.orderId) {
      const fetchedOrder = localStorageService.getOrders(currentUser.id).find(o => o.id === params.orderId);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      } else {
        // Order not found or doesn't belong to user
        router.replace('/profile/orders'); 
      }
    } else if (!currentUser) {
        router.replace(`/login?redirect=/order-confirmation/${params.orderId}`);
    }
    setIsLoading(false);
  }, [currentUser, params.orderId, router]);

  if (isLoading) {
    return <div className="text-center py-20">Loading order confirmation...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-20 space-y-4">
        <Package className="h-16 w-16 mx-auto text-destructive" />
        <h1 className="font-headline text-3xl text-destructive">Order Not Found</h1>
        <p className="text-muted-foreground">We couldn&apos;t find the details for this order.</p>
        <Button asChild variant="outline">
          <Link href="/profile/orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> View Your Orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 text-center max-w-2xl">
      <Card className="shadow-xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="bg-green-500/10 dark:bg-green-500/20 rounded-t-lg p-8">
          <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
          <CardTitle className="font-headline text-4xl text-green-700 dark:text-green-400">Thank You For Your Order!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your order <span className="font-semibold text-primary">#{order.id.substring(0, 8)}...</span> has been placed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="text-left space-y-3">
            <p><strong className="text-foreground">Order Date:</strong> {format(new Date(order.orderDate), 'PPP p')}</p>
            <p><strong className="text-foreground">Order Status:</strong> <span className="px-2 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground">{order.status}</span></p>
            <p><strong className="text-foreground">Total Amount:</strong> <span className="font-bold text-primary">${order.totalAmount.toFixed(2)}</span></p>
          </div>

          <div>
            <h3 className="font-headline text-xl text-primary mb-3 text-left">Items Purchased:</h3>
            <ul className="space-y-3 text-left">
              {order.items.map(item => {
                const hasRealImage = item.imageUrl && !item.imageUrl.startsWith('https://placehold.co');
                return (
                <li key={item.productId} className="flex items-center gap-3 p-3 border rounded-md bg-background/50">
                     {hasRealImage ? (
                        <Image 
                            src={item.imageUrl!} 
                            alt={item.name} 
                            width={50} height={50} 
                            className="w-12 h-12 object-cover rounded border"
                            data-ai-hint="confirmation item image"
                        />
                      ) : item.icon ? (
                         <div 
                            className="w-12 h-12 flex items-center justify-center bg-muted rounded border" 
                            data-ai-hint="product icon"
                            style={{'--icon-cutout-bg': 'hsl(var(--muted))'} as React.CSSProperties}
                          >
                            <span
                              className={cn(item.icon, 'css-icon-base text-primary')}
                              style={{ transform: 'scale(1)' }} 
                            >
                              {item.icon === 'css-icon-settings' && <span />}
                              {item.icon === 'css-icon-trash' && <i><em /></i>}
                              {item.icon === 'css-icon-file' && <span />}
                            </span>
                          </div>
                      ) : (
                         <Image 
                            src={`https://placehold.co/50x50.png?text=${encodeURIComponent(item.name.charAt(0))}`} 
                            alt={item.name} 
                            width={50} height={50} 
                            className="w-12 h-12 object-cover rounded border"
                            data-ai-hint="confirmation item placeholder"
                          />
                      )}
                  <div className="flex-grow">
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} &bull; Price: ${item.priceAtPurchase.toFixed(2)} each</p>
                  </div>
                  <p className="text-sm font-semibold">${(item.priceAtPurchase * item.quantity).toFixed(2)}</p>
                </li>
              )})}
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/products">
                <ShoppingBag className="mr-2 h-5 w-5" /> Continue Shopping
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/profile/orders">
                <Package className="mr-2 h-5 w-5" /> View Order History
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

