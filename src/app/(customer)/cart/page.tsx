
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Cart, CartItem, Product } from '@/types';
import { ArrowLeft, Trash2, ShoppingBag, Minus, Plus, Save, PackageSearch, ShoppingCartIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProductImage } from '@/components/product/ProductImage';
import { useDataSource } from '@/contexts/DataSourceContext';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const router = useRouter();
  const { toast } = useToast();

  const loadCartAndProducts = useCallback(async () => {
    if (!currentUser || isDataSourceLoading || !dataService) {
      if (!isDataSourceLoading && !currentUser) setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [userCart, products] = await Promise.all([
        dataService.getCart(currentUser.id),
        dataService.getProducts()
      ]);
      setCart(userCart);
      setAllProducts(products);
    } catch (error) {
      console.error("Error loading cart/products:", error);
      toast({ title: "Error", description: "Could not load cart data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    loadCartAndProducts();
    const handleCartUpdate = () => loadCartAndProducts();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [loadCartAndProducts]);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (!currentUser || !cart || !dataService || updatingItemId) return;

    setUpdatingItemId(productId);

    const productDetails = allProducts.find(p => p.id === productId);
    if (!productDetails) {
        toast({title: "Error", description: "Product details not found.", variant: "destructive"});
        setUpdatingItemId(null);
        return;
    }
    
    let updatedQuantity = Math.max(1, newQuantity);
    if (productDetails.stock < updatedQuantity) {
        toast({title: "Stock Limit", description: `Only ${productDetails.stock} units for ${productDetails.name}.`, variant: "destructive"});
        updatedQuantity = productDetails.stock;
    }
    if (updatedQuantity === 0 && productDetails.stock > 0) updatedQuantity = 1;

    try {
      const originalItem = cart.items.find(item => item.productId === productId);
      const originalQuantity = originalItem?.quantity || 0;

      const updatedItems = cart.items.map(item =>
        item.productId === productId ? { ...item, quantity: updatedQuantity } : item
      );
      const updatedCart = { ...cart, items: updatedItems };
      setCart(updatedCart);
      await dataService.updateCart(updatedCart);

      if (updatedQuantity !== originalQuantity) {
          await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'CART_QUANTITY_UPDATE', entityType: 'Product', entityId: productId, description: `Updated quantity of "${productDetails.name}" to ${updatedQuantity}.`});
      }
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch(e) {
      toast({title: "Error updating cart", variant: "destructive"});
      loadCartAndProducts(); // Re-fetch to fix state
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!currentUser || !cart || !dataService || updatingItemId) return;
    setUpdatingItemId(productId);
    try {
      const itemToRemove = cart.items.find(item => item.productId === productId);
      if (!itemToRemove) return;

      const updatedItems = cart.items.filter(item => item.productId !== productId);
      const updatedCart = { ...cart, items: updatedItems };
      setCart(updatedCart);
      await dataService.updateCart(updatedCart);
      
      await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'CART_REMOVE_ITEM', entityType: 'Product', entityId: productId, description: `Removed "${itemToRemove.name}" from cart.` });
      
      toast({ title: "Item Removed" });
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch(e) {
      toast({title: "Error removing item", variant: "destructive"});
      loadCartAndProducts();
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleMoveToSavedForLater = async (productId: string) => {
    if (!currentUser || !dataService || updatingItemId) return;
    setUpdatingItemId(productId);
    try {
      const itemToSave = allProducts.find(p => p.id === productId);
      await dataService.moveToSavedForLater(currentUser.id, productId);
      if (itemToSave) {
          await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'CART_SAVE_FOR_LATER', entityType: 'Product', entityId: productId, description: `Saved "${itemToSave.name}" for later.` });
      }
      toast({ title: "Item Saved for Later" });
      loadCartAndProducts();
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch(e) {
      toast({title: "Error saving item", variant: "destructive"});
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleMoveToCartFromSaved = async (productId: string) => {
    if (!currentUser || !dataService || updatingItemId) return;
    setUpdatingItemId(productId);
    const itemToMove = allProducts.find(p => p.id === productId);
    try {
      const success = await dataService.moveToCartFromSaved(currentUser.id, productId);
      if (success) {
          if(itemToMove) {
              await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'CART_MOVE_FROM_SAVED', entityType: 'Product', entityId: productId, description: `Moved "${itemToMove.name}" from Saved to Cart.` });
          }
          toast({ title: "Item Moved to Cart" });
      } else {
          toast({ title: "Could not move item", description: "Item may be out of stock.", variant: "destructive" });
      }
      loadCartAndProducts();
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch(e) {
      toast({title: "Error moving item", variant: "destructive"});
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveFromSaved = async (productId: string) => {
    if (!currentUser || !dataService || updatingItemId) return;
    setUpdatingItemId(productId);
    const itemToRemove = allProducts.find(p => p.id === productId);
    try {
      await dataService.removeFromSavedForLater(currentUser.id, productId);
      if (itemToRemove) {
          await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'CART_REMOVE_FROM_SAVED', entityType: 'Product', entityId: productId, description: `Removed "${itemToRemove.name}" from Saved for Later.` });
      }
      toast({ title: "Removed from Saved" });
      loadCartAndProducts();
    } catch(e) {
      toast({title: "Error removing saved item", variant: "destructive"});
    } finally {
      setUpdatingItemId(null);
    }
  };

  const subtotal = cart?.items.reduce((sum, item) => sum + item.quantity, 0) > 0 ? cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;
  const hasActiveItems = cart && cart.items.length > 0;
  const hasSavedItems = cart && cart.savedForLaterItems && cart.savedForLaterItems.length > 0;

  if (isLoading || isDataSourceLoading) {
    return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> Loading cart...</div>;
  }
  if (!currentUser) {
    router.push('/login?redirect=/cart');
    return <div className="text-center py-20">Please log in.</div>;
  }
  if (!hasActiveItems && !hasSavedItems) {
    return (
      <div className="text-center py-20 space-y-6">
        <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground" />
        <h1 className="font-headline text-4xl text-primary">Your Cart is Empty</h1>
        <p className="text-muted-foreground">Looks like you haven't added anything yet.</p>
        <Button asChild size="lg"><Link href="/products"><ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="font-headline text-4xl text-primary mb-8">Your Cart</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {hasActiveItems ? (
            cart.items.map(item => {
              const productDetails = allProducts.find(p => p.id === item.productId);
              return (
              <Card key={item.productId} className="flex flex-col sm:flex-row items-center gap-4 p-4 shadow-md relative">
                {updatingItemId === item.productId && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}
                <ProductImage
                  imageId={item.primaryImageId}
                  alt={item.name}
                  className="w-24 h-24 rounded-md border"
                  imageClassName="object-cover"
                  width={100} height={100}
                  placeholderIconSize="w-10 h-10"
                  data-ai-hint="cart item"
                />
                <div className="flex-grow text-center sm:text-left">
                  <Link href={`/products/${item.productId}`} className="hover:underline">
                      <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
                  </Link>
                  <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                  {productDetails && productDetails.stock < item.quantity && <p className="text-xs text-destructive">Requested > stock ({productDetails.stock})</p>}
                </div>
                <div className="flex items-center gap-2 my-2 sm:my-0">
                  <Button variant="outline" size="icon" onClick={() => handleQuantityChange(item.productId, item.quantity - 1)} disabled={item.quantity <= 1 || !!updatingItemId}><Minus className="h-4 w-4" /></Button>
                  <Input type="number" value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value))}
                    min="1" max={productDetails?.stock || item.quantity} className="w-16 h-10 text-center" disabled={!!updatingItemId} />
                  <Button variant="outline" size="icon" onClick={() => handleQuantityChange(item.productId, item.quantity + 1)} disabled={!!productDetails && item.quantity >= productDetails.stock || !!updatingItemId}><Plus className="h-4 w-4" /></Button>
                </div>
                <p className="text-lg font-semibold w-24 text-center sm:text-right">${(item.price * item.quantity).toFixed(2)}</p>
                <div className="flex flex-col sm:flex-row gap-1 items-center">
                    <Button variant="ghost" size="sm" onClick={() => handleMoveToSavedForLater(item.productId)} className="text-xs text-muted-foreground hover:text-primary h-auto p-1" disabled={!!updatingItemId}>
                        <Save className="mr-1 h-3 w-3"/> Save for Later
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.productId)} className="text-destructive hover:bg-destructive/10" disabled={!!updatingItemId}><Trash2 className="h-5 w-5" /></Button>
                </div>
              </Card>
            )})
          ) : (
            <Card className="text-center py-10">
              <CardHeader>
                  <ShoppingCartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <CardTitle>Your Active Cart is Empty</CardTitle>
                <CardDescription>Items you want to buy now will appear here.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild><Link href="/products"><ArrowLeft className="mr-2 h-5 w-5" /> Continue Shopping</Link></Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          {hasActiveItems && (
            <Card className="sticky top-24 shadow-lg mb-8">
              <CardHeader><CardTitle className="font-headline text-2xl text-primary">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">FREE</span></div>
                <div className="flex justify-between text-xl font-bold border-t pt-4"><span>Total</span><span>${subtotal.toFixed(2)}</span></div>
              </CardContent>
              <CardFooter>
                <Button size="lg" className="w-full" asChild><Link href="/checkout">Checkout <ShoppingBag className="ml-2 h-5 w-5"/></Link></Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {hasSavedItems && (
        <div className="mt-12">
          <Separator className="my-8"/>
          <h2 className="font-headline text-3xl text-primary mb-6">Saved For Later</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:col-span-2">
            {cart.savedForLaterItems?.map(item => {
                const productDetails = allProducts.find(p => p.id === item.productId);
                return (
                  <Card key={`saved-${item.productId}`} className="flex flex-col sm:flex-row items-center gap-4 p-4 shadow-sm relative">
                    {updatingItemId === item.productId && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                    <ProductImage
                      imageId={item.primaryImageId}
                      alt={item.name}
                      className="w-20 h-20 rounded-md border"
                      imageClassName="object-cover"
                       width={80} height={80}
                      placeholderIconSize="w-8 h-8"
                      data-ai-hint="saved item"
                    />
                    <div className="flex-grow text-center sm:text-left">
                      <Link href={`/products/${item.productId}`} className="hover:underline">
                          <h3 className="text-md font-semibold text-foreground">{item.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-stretch sm:items-end">
                      <Button size="sm" onClick={() => handleMoveToCartFromSaved(item.productId)} disabled={(productDetails?.stock || 0) < item.quantity || !!updatingItemId}>
                        <ShoppingCartIcon className="mr-2 h-4 w-4"/>Add to Cart
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveFromSaved(item.productId)} className="text-xs text-destructive hover:bg-destructive/5" disabled={!!updatingItemId}>
                        <Trash2 className="mr-1 h-3 w-3"/>Remove
                      </Button>
                    </div>
                  </Card>
                )
            })}
          </div>
        </div>
      )}
       {!hasActiveItems && hasSavedItems && (
         <div className="lg:col-span-3 mt-8 text-center">
             <Button asChild size="lg"><Link href="/products"><ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping</Link></Button>
         </div>
       )}
    </div>
  );
}
