
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorage';
import type { Order } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, ArrowLeft, ImageOff } from 'lucide-react'; // Added ImageOff
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const PLACEHOLDER_IMAGE_ORDER_ITEM = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWNlZjFhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwcHgiIGZpbGw9IiNjY2MiPkltYWdlPC90ZXh0Pjwvc3ZnPg==";


export default function OrderHistoryPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const userOrders = localStorageService.getOrders(currentUser.id);
      setOrders(userOrders);
    }
    setIsLoading(false);
  }, [currentUser]);

  if (authLoading || isLoading) {
    return <div className="text-center py-10">Loading your order history...</div>;
  }

  if (!currentUser) {
    return <div className="text-center py-10">Please <Link href="/login?redirect=/profile/orders" className="text-primary hover:underline">login</Link> to view your order history.</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <PackageSearch className="h-24 w-24 mx-auto text-muted-foreground" />
        <h1 className="font-headline text-4xl text-primary">No Orders Yet</h1>
        <p className="text-lg text-muted-foreground">You haven&apos;t placed any orders with us.</p>
        <Button asChild size="lg">
          <Link href="/products">
            <ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-headline text-4xl text-primary">My Order History</h1>
        <p className="text-muted-foreground">Review your past purchases.</p>
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
                   <Badge variant={order.status === 'Completed' || order.status === 'Delivered' ? 'default' : 'secondary'} className="text-xs">
                     {order.status}
                   </Badge>
                   <p className="text-lg font-semibold text-foreground">${order.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 border-t">
              <h4 className="text-md font-semibold mb-2 text-foreground">Items in this order:</h4>
              <ul className="space-y-3">
                {order.items.map(item => {
                   const imageSrc = item.primaryImageDataUri || PLACEHOLDER_IMAGE_ORDER_ITEM;
                   return (
                    <li key={item.productId} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                      {imageSrc === PLACEHOLDER_IMAGE_ORDER_ITEM && !item.primaryImageDataUri ? (
                        <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-md border" data-ai-hint="order item placeholder">
                           <ImageOff className="w-8 h-8 text-muted-foreground" />
                        </div>
                      ) : (
                        <Image 
                            src={imageSrc} 
                            alt={item.name} 
                            width={60} height={60} 
                            className="w-16 h-16 object-cover rounded-md border"
                            data-ai-hint="order item image"
                            unoptimized={imageSrc.startsWith('data:image')}
                        />
                      )}
                      <div className="flex-grow">
                        <Link href={`/products/${item.productId}`} className="font-medium hover:text-primary hover:underline">{item.name}</Link>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">${(item.priceAtPurchase * item.quantity).toFixed(2)}</p>
                    </li>
                   )
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
