
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { localStorageService } from '@/lib/localStorageService';
import type { Cart, OrderItem, Address } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Lock, Loader2, ShoppingBag, PlusCircle, Home, MapPin } from 'lucide-react';
import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AddressForm, AddressFormValues } from '@/components/customer/AddressForm';
import { simpleUUID } from '@/lib/utils';

export default function CheckoutPage() {
  const { currentUser, refreshUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [isAddressFormModalOpen, setIsAddressFormModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);
  const [isAddressFormSubmitting, setIsAddressFormSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const userCart = localStorageService.getCart(currentUser.id);
      setCart(userCart);
      if (!userCart || userCart.items.length === 0) {
        toast({ title: "Empty Cart", variant: "destructive" });
        router.replace('/products');
      }

      const userAddresses = localStorageService.getUserAddresses(currentUser.id);
      setAddresses(userAddresses);
      const defaultAddress = userAddresses.find(addr => addr.isDefault);
      setSelectedAddressId(defaultAddress?.id || (userAddresses.length > 0 ? userAddresses[0].id : undefined));

    } else {
      router.replace('/login?redirect=/checkout');
    }
    setIsLoading(false);
  }, [currentUser, router, toast]);

  const refreshUserAddresses = () => {
    if (currentUser) {
      const userAddresses = localStorageService.getUserAddresses(currentUser.id);
      setAddresses(userAddresses);
      const currentSelected = userAddresses.find(a => a.id === selectedAddressId);
      if (!currentSelected) {
          const defaultAddr = userAddresses.find(addr => addr.isDefault);
          setSelectedAddressId(defaultAddr?.id || (userAddresses.length > 0 ? userAddresses[0].id : undefined));
      } else if (!currentSelected.isDefault && userAddresses.some(a => a.isDefault && a.id !== currentSelected.id)) {
          const defaultAddr = userAddresses.find(addr => addr.isDefault);
          setSelectedAddressId(defaultAddr?.id);
      }
      refreshUser();
    }
  };

  const handleAddressFormSubmit = async (data: AddressFormValues, id?: string) => {
    if (!currentUser) return;
    setIsAddressFormSubmitting(true);
    try {
      let newAddress;
      if (id) { 
        newAddress = localStorageService.updateUserAddress(currentUser.id, { ...data, id, userId: currentUser.id });
        toast({ title: "Address Updated" });
      } else { 
        newAddress = localStorageService.addAddressToUser(currentUser.id, data);
        toast({ title: "Address Added" });
      }
      refreshUserAddresses();
      if (newAddress && (newAddress.isDefault || addresses.length === 0)) { 
        setSelectedAddressId(newAddress.id);
      }
      setIsAddressFormModalOpen(false);
      setAddressToEdit(null);
    } catch (error) {
      toast({ title: "Address Error", variant: "destructive" });
    } finally {
      setIsAddressFormSubmitting(false);
    }
  };


  const subtotal = cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const shippingCost = 0; 
  const totalAmount = subtotal + shippingCost;

  const handleMockPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !cart || cart.items.length === 0) return;
    if (!selectedAddressId) {
        toast({ title: "Shipping Address Required", description: "Please select or add a shipping address.", variant: "destructive"});
        return;
    }
    const shippingAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (!shippingAddress) {
        toast({ title: "Invalid Shipping Address", description: "Please re-select your shipping address.", variant: "destructive"});
        return;
    }

    setIsProcessingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 2500));

    const orderItems: OrderItem[] = cart.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.price,
      name: item.name,
      primaryImageId: item.primaryImageId,
    }));

    try {
      const newOrder = localStorageService.addOrder({
        userId: currentUser.id,
        items: orderItems,
        totalAmount: totalAmount,
        status: 'Completed',
        shippingAddress: shippingAddress, 
        paymentDetails: { method: 'MockCard', transactionId: `mock_txn_${simpleUUID()}` }
      });
      localStorageService.clearCart(currentUser.id);
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      toast({ title: "Payment Successful!"});
      router.push(`/order-confirmation/${newOrder.id}`);
    } catch (error) {
      toast({ title: "Order Error", variant: "destructive"});
      setIsProcessingPayment(false);
    }
  };

  if (isLoading || (!currentUser && !cart)) {
    return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />Loading...</div>;
  }
  if (!cart || cart.items.length === 0) {
    return (
        <div className="text-center py-20 space-y-6">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground" />
            <h1 className="font-headline text-4xl text-primary">Cart is Empty</h1>
            <Button asChild size="lg"><Link href="/products"><ArrowLeft className="mr-2 h-5 w-5" /> Start Shopping</Link></Button>
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
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary flex items-center"><MapPin className="mr-3 h-6 w-6"/>Shipping Address</CardTitle>
              <CardDescription>Select where you&apos;d like your order delivered.</CardDescription>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <div className="text-center py-6">
                  <Home className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No addresses saved yet.</p>
                   <Dialog open={isAddressFormModalOpen} onOpenChange={(isOpen) => {
                        setIsAddressFormModalOpen(isOpen);
                        if (!isOpen) setAddressToEdit(null);
                    }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {setAddressToEdit(null); setIsAddressFormModalOpen(true);}}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Shipping Address
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                       <AddressForm
                            initialData={null}
                            onSubmit={handleAddressFormSubmit}
                            onCancel={() => { setIsAddressFormModalOpen(false); setAddressToEdit(null);}}
                            isSubmitting={isAddressFormSubmitting}
                            submitButtonText="Save Address"
                        />
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-3">
                  {addresses.map((address) => (
                    <Label key={address.id} htmlFor={`address-${address.id}`}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${selectedAddressId === address.id ? 'border-primary ring-2 ring-primary' : ''}`}>
                      <RadioGroupItem value={address.id} id={`address-${address.id}`} className="mt-1 mr-3" />
                      <div className="flex-grow text-sm">
                        <p className="font-semibold text-foreground">{address.recipientName} {address.isDefault && <span className="text-xs text-primary font-medium ml-1">(Default)</span>}</p>
                        <p>{address.addressLine1}</p>
                        {address.addressLine2 && <p>{address.addressLine2}</p>}
                        <p>{address.city}, {address.stateOrProvince} {address.postalCode}</p>
                        <p>{address.country}</p>
                        {address.phoneNumber && <p>Phone: {address.phoneNumber}</p>}
                      </div>
                       <Button variant="ghost" size="sm" className="ml-auto text-xs h-auto p-1 self-start" onClick={(e) => {e.preventDefault(); router.push('/profile/addresses')}}>Edit</Button>
                    </Label>
                  ))}
                </RadioGroup>
              )}
               {addresses.length > 0 && (
                 <Dialog open={isAddressFormModalOpen} onOpenChange={(isOpen) => {
                      setIsAddressFormModalOpen(isOpen);
                      if (!isOpen) setAddressToEdit(null);
                  }}>
                    <DialogTrigger asChild>
                       <Button variant="outline" className="mt-4 w-full" onClick={() => {setAddressToEdit(null); setIsAddressFormModalOpen(true);}}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                       <AddressForm
                            initialData={addressToEdit}
                            onSubmit={handleAddressFormSubmit}
                            onCancel={() => { setIsAddressFormModalOpen(false); setAddressToEdit(null);}}
                            isSubmitting={isAddressFormSubmitting}
                            submitButtonText={addressToEdit ? 'Update Address' : 'Save Address'}
                        />
                    </DialogContent>
                  </Dialog>
                )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Payment (Mock)</CardTitle>
              <CardDescription>Simulated payment form.</CardDescription>
            </CardHeader>
            <form onSubmit={handleMockPayment}>
              <CardContent className="space-y-6">
                <div className="space-y-2"><Label htmlFor="cardName">Cardholder</Label><Input id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="cardNumber">Card Number</Label><div className="relative"><Input id="cardNumber" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19))} required /><CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /></div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="expiryDate">Expiry</Label><Input id="expiryDate" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value.replace(/[^0-9/]/g, '').replace(/^(\d{2})(\d)/g, '$1/$2').slice(0,5))} required /></div>
                  <div className="space-y-2"><Label htmlFor="cvc">CVC</Label><Input id="cvc" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0,3))} required /></div>
                </div>
                 <div className="flex items-center space-x-2 pt-2"><Lock className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Payment is mocked.</span></div>
              </CardContent>
              <CardFooter>
                <Button type="submit" size="lg" className="w-full" disabled={isProcessingPayment || !selectedAddressId}>
                  {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                  {isProcessingPayment ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-lg">
            <CardHeader><CardTitle className="font-headline text-2xl text-primary">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {cart.items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                    <ProductImage
                        imageId={item.primaryImageId}
                        alt={item.name}
                        className="w-16 h-16 rounded-md border"
                        imageClassName="object-cover"
                        width={60} height={60}
                        placeholderIconSize="w-8 h-8"
                        data-ai-hint="checkout item"
                    />
                  <div className="flex-grow"><p className="font-medium text-sm text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">Qty: {item.quantity}</p></div>
                  <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">${shippingCost.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold text-primary border-t pt-2 mt-2"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
