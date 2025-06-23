
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Order } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProductImage } from '@/components/product/ProductImage';
import { useDataSource } from '@/contexts/DataSourceContext'; // Added
import { useToast } from '@/hooks/use-toast'; // Added

export default function OrderHistoryPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isComponentLoading, setIsComponentLoading] = useState(true); // Renamed
  const { dataService, isLoading: isDataSourceLoading } = useDataSource(); // Added
  const { toast } = useToast(); // Added

  const fetchOrders = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading) {
      setIsComponentLoading(true); // Keep loading if dependencies not ready
      return;
    }
    setIsComponentLoading(true);
    try {
      const userOrders = await dataService.getOrders(currentUser.id);
      setOrders(userOrders);
    } catch (error) {
      console.error("Error fetching order history:", error);
      toast({ title: "Error", description: "Could not load order history.", variant: "destructive" });
      setOrders([]); // Clear orders on error
    } finally {
      setIsComponentLoading(false);
    }
  }, [currentUser, dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    if (!authLoading) { // Only fetch if auth state is resolved
        fetchOrders();
    }
  }, [currentUser, authLoading, fetchOrders]); // fetchOrders is memoized

  if (authLoading || isDataSourceLoading || isComponentLoading) {
    return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> Loading...</div>;
  }
  
  if (!currentUser) { // This check should ideally happen after authLoading is false
    return <div className="text-center py-10">Please <Link href="/login?redirect=/profile/orders" className="text-primary hover:underline">login</Link>.</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <PackageSearch className="h-24 w-24 mx-auto text-muted-foreground" />
        <h1 className="font-headline text-4xl text-primary">No Orders Yet</h1>
        <Button asChild size="lg"><Link href="/products"><ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-headline text-4xl text-primary">Order History</h1>
        <p className="text-muted-foreground">Review past purchases.</p>
      </header>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {orders.map(order => (
          <AccordionItem value={order.id} key={order.id} className="bg-card border rounded-lg shadow-sm">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full text-left">
                <div className="mb-2 sm:mb-0">
                  <p className="text-sm font-medium text-primary">Order ID: <span className="font-mono text-xs">{order.id.substring(0,8)}...</span></p>
                  <p className="text-xs text-muted-foreground">Date: {format(new Date(order.orderDate), 'PPP p')}</p>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                   <Badge variant={order.status === 'Completed' || order.status === 'Delivered' ? 'default' : 'secondary'} className="text-xs">{order.status}</Badge>
                   <p className="text-lg font-semibold text-foreground">${order.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 border-t">
              <h4 className="text-md font-semibold mb-2 text-foreground">Items:</h4>
              <ul className="space-y-3">
                {order.items.map(item => (
                    <li key={item.productId} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                      <ProductImage
                        imageId={item.primaryImageId}
                        alt={item.name}
                        className="w-16 h-16 rounded-md border"
                        imageClassName="object-cover"
                        width={60} height={60}
                        placeholderIconSize="w-8 h-8"
                        data-ai-hint="order item"
                      />
                      <div className="flex-grow">
                        <Link href={`/products/${item.productId}`} className="font-medium hover:text-primary hover:underline">{item.name}</Link>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">${item.priceAtPurchase ? (item.priceAtPurchase * item.quantity).toFixed(2) : 'N/A'}</p>
                    </li>
                   )
                )}
              </ul>
                 {order.shippingAddress && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-md font-semibold mb-1 text-foreground">Shipping Address:</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>{order.shippingAddress.recipientName}</p>
                      <p>{order.shippingAddress.addressLine1}</p>
                      {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                      <p>{order.shippingAddress.city}, {order.shippingAddress.stateOrProvince} {order.shippingAddress.postalCode}</p>
                      <p>{order.shippingAddress.country}</p>
                      {order.shippingAddress.phoneNumber && <p>Phone: {order.shippingAddress.phoneNumber}</p>}
                    </div>
                  </div>
                )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
