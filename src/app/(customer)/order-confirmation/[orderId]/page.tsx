
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package, ArrowLeft, ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ProductImage } from '@/components/product/ProductImage';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useToast } from '@/hooks/use-toast';

export default function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>();
  const orderIdFromParams = params?.orderId;


  const { currentUser } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();

  const fetchOrder = useCallback(async (orderId: string, userId?: string) => {
    if (!dataService || isDataSourceLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      if (userId) {
        const userOrders = await dataService.getOrders(userId);
        const fetchedOrder = userOrders.find(o => o.id === orderId);
        if (fetchedOrder) {
          setOrder(fetchedOrder);
        } else {
          toast({title: "Order Not Found", variant: "destructive"});
          router.replace('/profile/orders');
        }
      } else {
         toast({title: "User not identified", variant: "destructive"});
         router.replace('/login'); 
      }
    } catch (error) {
      console.error("Error fetching order for confirmation:", error);
      toast({title: "Error", description:"Could not load order details.", variant: "destructive"});
      router.replace('/profile/orders');
    } finally {
      setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, router, toast]);

  useEffect(() => {
    if (orderIdFromParams) {
      if (currentUser) {
        fetchOrder(orderIdFromParams, currentUser.id);
      } else if (!isDataSourceLoading && !currentUser) { 
          router.replace(`/login?redirect=/order-confirmation/${orderIdFromParams}`);
      }
    } else if (!orderIdFromParams && !isDataSourceLoading) {
      router.replace('/profile/orders');
    }
  }, [currentUser, orderIdFromParams, fetchOrder, isDataSourceLoading, router]);

  if (isLoading || isDataSourceLoading || !orderIdFromParams) {
    return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> Loading...</div>;
  }
  
  if (!order) {
    return (
    <div className="text-center py-20 space-y-4">
      <Package className="h-16 w-16 mx-auto text-destructive" />
      <h1 className="font-headline text-3xl text-destructive">Order Not Found</h1>
      <Button asChild variant="outline"><Link href="/profile/orders"><ArrowLeft className="mr-2 h-4 w-4" /> View Orders</Link></Button>
    </div>
    );
  }


  return (
    <div className="container mx-auto py-12 px-4 text-center max-w-2xl">
      <Card className="shadow-xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="bg-green-500/10 dark:bg-green-500/20 rounded-t-lg p-8">
          <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
          <CardTitle className="font-headline text-4xl text-green-700 dark:text-green-400">Thank You!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Order <span className="font-semibold text-primary">#{order.id.substring(0, 8)}...</span> placed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="text-left space-y-3">
            <p><strong className="text-foreground">Date:</strong> {format(new Date(order.orderDate), 'PPP p')}</p>
            <p><strong className="text-foreground">Status:</strong> <span className="px-2 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground">{order.status}</span></p>
            <p><strong className="text-foreground">Total:</strong> <span className="font-bold text-primary">${order.totalAmount.toFixed(2)}</span></p>
          </div>
          <div>
            <h3 className="font-headline text-xl text-primary mb-3 text-left">Items:</h3>
            <ul className="space-y-3 text-left">
              {order.items.map(item => (
                <li key={item.productId} className="flex items-center gap-3 p-3 border rounded-md bg-background/50">
                    <ProductImage
                        imageId={item.primaryImageId}
                        alt={item.name}
                        className="w-12 h-12 rounded-md border"
                        imageClassName="object-cover"
                        width={50} height={50}
                        placeholderIconSize="w-6 h-6"
                        data-ai-hint="confirmation item"
                    />
                  <div className="flex-grow">
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} &bull; Price: ${item.priceAtPurchase?.toFixed(2) ?? 'N/A'}</p>
                  </div>
                  <p className="text-sm font-semibold">${item.priceAtPurchase ? (item.priceAtPurchase * item.quantity).toFixed(2) : 'N/A'}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg"><Link href="/products"><ShoppingBag className="mr-2 h-5 w-5" /> Continue Shopping</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/profile/orders"><Package className="mr-2 h-5 w-5" /> View Orders</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
    
