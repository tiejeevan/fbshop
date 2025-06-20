
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Star, MapPin, Home, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Address } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddressForm, type AddressFormValues } from '@/components/customer/AddressForm';
import { Badge } from '@/components/ui/badge';
import { useDataSource } from '@/contexts/DataSourceContext'; // Added

export default function AddressesPage() {
  const { currentUser, isLoading: authLoading, refreshUser } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isComponentLoading, setIsComponentLoading] = useState(true); // Renamed
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { toast } = useToast();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource(); // Added

  const fetchAddresses = useCallback(async () => {
    if (!currentUser || !dataService || isDataSourceLoading) {
      setIsComponentLoading(true);
      return;
    }
    setIsComponentLoading(true);
    try {
      const userAddresses = await dataService.getUserAddresses(currentUser.id);
      setAddresses(userAddresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast({ title: "Error", description: "Could not load addresses.", variant: "destructive" });
      setAddresses([]);
    } finally {
      setIsComponentLoading(false);
    }
  }, [currentUser, dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    if (!authLoading) { // Only fetch if auth state is resolved
        fetchAddresses();
    }
  }, [currentUser, authLoading, fetchAddresses]);

  const handleAddAddress = async (data: AddressFormValues) => {
    if (!currentUser || !dataService) {
        toast({ title: "Error", description: "User or data service not available.", variant: "destructive" });
        return;
    }
    setIsFormSubmitting(true);
    try {
      await dataService.addAddressToUser(currentUser.id, data);
      toast({ title: 'Address Added', description: 'Your new address has been saved.' });
      fetchAddresses(); // Re-fetch to update list
      setIsFormModalOpen(false);
      refreshUser(); // Potentially refresh user data if addresses are part of user object
    } catch (error) {
      toast({ title: 'Error', description: 'Could not add address.', variant: 'destructive' });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleEditAddress = async (data: AddressFormValues, addressId?: string) => {
    if (!currentUser || !addressId || !dataService) {
        toast({ title: "Error", description: "User, address ID or data service not available.", variant: "destructive" });
        return;
    }
    setIsFormSubmitting(true);
    try {
      const addressToUpdate: Address = { ...data, id: addressId, userId: currentUser.id };
      await dataService.updateUserAddress(currentUser.id, addressToUpdate);
      toast({ title: 'Address Updated', description: 'Your address has been updated.' });
      fetchAddresses();
      setAddressToEdit(null);
      setIsFormModalOpen(false);
      refreshUser();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not update address.', variant: 'destructive' });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!currentUser || !addressToDelete || !dataService) {
        toast({ title: "Error", description: "User, address to delete or data service not available.", variant: "destructive" });
        return;
    }
    try {
      await dataService.deleteUserAddress(currentUser.id, addressToDelete.id);
      toast({ title: 'Address Deleted' });
      fetchAddresses();
      refreshUser();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not delete address.', variant: 'destructive' });
    }
    setAddressToDelete(null);
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!currentUser || !dataService) {
        toast({ title: "Error", description: "User or data service not available.", variant: "destructive" });
        return;
    }
    try {
      await dataService.setDefaultUserAddress(currentUser.id, addressId);
      toast({ title: 'Default Address Updated' });
      fetchAddresses();
      refreshUser();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not set default address.', variant: 'destructive' });
    }
  };

  if (authLoading || isDataSourceLoading || isComponentLoading) {
    return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/> Loading addresses...</div>;
  }
  if (!currentUser) {
    return <div className="text-center py-10">Please log in to manage your addresses.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl text-primary flex items-center">
            <MapPin className="mr-3 h-7 w-7"/>Your Addresses
        </h1>
        <Dialog open={isFormModalOpen} onOpenChange={(isOpen) => {
            setIsFormModalOpen(isOpen);
            if (!isOpen) setAddressToEdit(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setAddressToEdit(null); setIsFormModalOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <AddressForm
              initialData={addressToEdit}
              onSubmit={addressToEdit ? handleEditAddress : handleAddAddress}
              onCancel={() => { setIsFormModalOpen(false); setAddressToEdit(null); }}
              isSubmitting={isFormSubmitting}
              submitButtonText={addressToEdit ? 'Update Address' : 'Save Address'}
            />
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <Card className="text-center py-10">
          <CardHeader>
            <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>No Addresses Saved Yet</CardTitle>
            <CardDescription>Add your first shipping address to make checkout faster.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={() => { setAddressToEdit(null); setIsFormModalOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id} className={`shadow-md ${address.isDefault ? 'border-primary ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-start">
                  <span>{address.recipientName}</span>
                  {address.isDefault && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/30">
                      <Star className="mr-1 h-3 w-3 fill-primary" /> Default
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>{address.city}, {address.stateOrProvince} {address.postalCode}</p>
                <p>{address.country}</p>
                {address.phoneNumber && <p>Phone: {address.phoneNumber}</p>}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                {!address.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleSetDefaultAddress(address.id)}>
                    Set Default
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { setAddressToEdit(address); setIsFormModalOpen(true); }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" onClick={() => setAddressToDelete(address)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                   {addressToDelete && addressToDelete.id === address.id && (
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Address?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this address for "{addressToDelete.recipientName}"?
                          {addressToDelete.isDefault && " This is your default address."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAddressToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAddress} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                          Confirm Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                   )}
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
